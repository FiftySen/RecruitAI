import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Separator } from './ui/separator';
import { ArrowLeft, MapPin, Calendar, DollarSign, Users, Clock, CheckCircle, AlertCircle, Briefcase } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface JobPosition {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string; // full-time, part-time, contract
  salary: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  assessmentWeights: {
    softSkills: number;
    technical: number;
  };
  createdAt: string;
  updatedAt: string;
  status: 'open' | 'closed';
}

interface JobApplication {
  userId: string;
  positionId: string;
  appliedAt: string;
  status: string;
  position?: JobPosition;
}

interface JobPositionsProps {
  onBack: () => void;
}

export function JobPositions({ onBack }: JobPositionsProps) {
  const { user } = useAuth();
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null);

  useEffect(() => {
    fetchPositions();
    fetchUserApplications();
  }, []);

  const fetchPositions = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/get-job-positions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch positions');
      }

      const data = await response.json();
      setPositions(data.positions.filter((pos: JobPosition) => pos.status === 'open'));
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast.error('Failed to load job positions');
    }
  };

  const fetchUserApplications = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/get-user-applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      setApplications(data.applications);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyForJob = async (positionId: string) => {
    if (!user?.id) return;

    setApplying(positionId);

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/apply-for-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          userId: user.id,
          positionId: positionId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Application failed');
      }

      toast.success('Application submitted successfully!');
      fetchUserApplications(); // Refresh applications
    } catch (error) {
      console.error('Error applying for job:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to apply for job');
    } finally {
      setApplying(null);
    }
  };

  const hasApplied = (positionId: string) => {
    return applications.some(app => app.positionId === positionId);
  };

  const formatSalary = (salary: string) => {
    if (!salary) return 'Salary not specified';
    return salary;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getJobTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'full-time': return 'bg-green-100 text-green-800';
      case 'part-time': return 'bg-blue-100 text-blue-800';
      case 'contract': return 'bg-orange-100 text-orange-800';
      case 'internship': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={onBack} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl">Available Job Positions</h1>
            <p className="text-gray-600">Browse and apply for positions that match your skills</p>
          </div>
        </div>

        {applications.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl mb-4">Your Applications ({applications.length})</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
              {applications.map((application) => (
                <Card key={`${application.positionId}-${application.appliedAt}`} className="border-blue-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {application.position?.title || 'Position'}
                      </CardTitle>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Applied
                      </Badge>
                    </div>
                    <CardDescription>
                      {application.position?.company} • Applied {formatDate(application.appliedAt)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {application.position?.location}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Separator className="mb-6" />
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-xl mb-4">Open Positions ({positions.length})</h2>
        </div>

        {positions.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <Briefcase className="h-12 w-12 text-gray-400" />
              <div>
                <h3 className="text-lg mb-2">No Open Positions</h3>
                <p className="text-gray-600">Check back later for new job opportunities.</p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {positions.map((position) => (
              <Card key={position.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-1">{position.title}</CardTitle>
                      <CardDescription className="text-base mb-3">{position.company}</CardDescription>
                    </div>
                    <Badge className={getJobTypeColor(position.type)}>
                      {position.type}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {position.location}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="h-4 w-4" />
                      {formatSalary(position.salary)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      Posted {formatDate(position.createdAt)}
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                    {position.description}
                  </p>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Users className="h-3 w-3" />
                      Soft Skills: {position.assessmentWeights?.softSkills || 50}%
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Clock className="h-3 w-3" />
                      Technical: {position.assessmentWeights?.technical || 50}%
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => setSelectedPosition(position)}
                        >
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-2xl">{position.title}</DialogTitle>
                          <DialogDescription className="text-lg">
                            {position.company} • {position.location} • {position.type}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-5 w-5 text-gray-500" />
                              <span>{formatSalary(position.salary)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-5 w-5 text-gray-500" />
                              <span>Posted {formatDate(position.createdAt)}</span>
                            </div>
                          </div>

                          <div>
                            <h3 className="font-medium mb-2">Job Description</h3>
                            <p className="text-gray-700 whitespace-pre-line">{position.description}</p>
                          </div>

                          {position.requirements && position.requirements.length > 0 && (
                            <div>
                              <h3 className="font-medium mb-2">Requirements</h3>
                              <ul className="list-disc list-inside space-y-1">
                                {position.requirements.map((req, index) => (
                                  <li key={index} className="text-gray-700">{req}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {position.responsibilities && position.responsibilities.length > 0 && (
                            <div>
                              <h3 className="font-medium mb-2">Responsibilities</h3>
                              <ul className="list-disc list-inside space-y-1">
                                {position.responsibilities.map((resp, index) => (
                                  <li key={index} className="text-gray-700">{resp}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {position.benefits && position.benefits.length > 0 && (
                            <div>
                              <h3 className="font-medium mb-2">Benefits</h3>
                              <ul className="list-disc list-inside space-y-1">
                                {position.benefits.map((benefit, index) => (
                                  <li key={index} className="text-gray-700">{benefit}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div>
                            <h3 className="font-medium mb-2">Assessment Weighting</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Users className="h-5 w-5 text-blue-600" />
                                  <span className="font-medium">Soft Skills</span>
                                </div>
                                <p className="text-2xl font-bold text-blue-600">
                                  {position.assessmentWeights?.softSkills || 50}%
                                </p>
                              </div>
                              <div className="bg-green-50 p-3 rounded-lg">
                                <div className="flex items-center gap-2">
                                  <Clock className="h-5 w-5 text-green-600" />
                                  <span className="font-medium">Technical Skills</span>
                                </div>
                                <p className="text-2xl font-bold text-green-600">
                                  {position.assessmentWeights?.technical || 50}%
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {hasApplied(position.id) ? (
                      <Button disabled size="sm" className="flex-1">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Applied
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => applyForJob(position.id)}
                        disabled={applying === position.id}
                        size="sm"
                        className="flex-1"
                      >
                        {applying === position.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Applying...
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Apply Now
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}