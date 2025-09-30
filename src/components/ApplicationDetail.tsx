import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { 
  ArrowLeft,
  Building,
  MapPin,
  Calendar,
  Users,
  Code,
  CheckCircle,
  Clock,
  Play,
  Award,
  AlertTriangle,
  Eye,
  TrendingUp,
  ExternalLink
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface JobPosition {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  assessmentWeights: {
    softSkills: number;
    technical: number;
  };
  // Add the assessmentConfiguration field
  assessmentConfiguration?: {
    softSkillsAreas: string[];
    technicalAreas: string[];
    softSkillsSubAreas: Record<string, string[]>;
    technicalSubSkills: Record<string, string[]>;
    selectedSoftSkillsSubAreas: string[];
    selectedTechnicalSubSkills: string[];
    customSoftSkills: string;
    customTechnicalSkills: string;
  };
  createdAt: string;
}

interface JobApplication {
  userId: string;
  positionId: string;
  appliedAt: string;
  status: string;
  position?: JobPosition;
  assessmentStatus?: {
    softSkills: 'not_started' | 'completed';
    technical: 'not_started' | 'completed';
  };
  scores?: {
    softSkills: number;
    technical: number;
    weighted: number;
  };
}

interface ApplicationDetailProps {
  applicationId: string;
  onBack: () => void;
  onNavigate: (page: 'soft-skills' | 'technical' | 'results' | 'job-detail-from-application', jobId?: string) => void;
}

export function ApplicationDetail({ applicationId, onBack, onNavigate }: ApplicationDetailProps) {
  const { user } = useAuth();
  const [application, setApplication] = useState<JobApplication | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplicationDetails();
  }, [applicationId]);

  const fetchApplicationDetails = async () => {
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

      if (!response.ok) throw new Error('Failed to fetch application details');

      const data = await response.json();
      const applicationDetails = data.applications?.find((app: JobApplication) => app.positionId === applicationId);
      setApplication(applicationDetails || null);
    } catch (error) {
      console.error('Error fetching application details:', error);
      toast.error('Failed to load application details');
    } finally {
      setLoading(false);
    }
  };

  const getApplicationStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border border-red-200';
      case 'under_review': return 'bg-blue-100 text-blue-800 border border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getProgressPercentage = () => {
    if (!application?.assessmentStatus) return 0;
    
    const softSkillsComplete = application.assessmentStatus.softSkills === 'completed';
    const technicalComplete = application.assessmentStatus.technical === 'completed';
    
    if (softSkillsComplete && technicalComplete) return 100;
    if (softSkillsComplete || technicalComplete) return 50;
    return 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading application details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Application Not Found</h2>
            <p className="text-gray-600 mb-6">The application you're looking for doesn't exist.</p>
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Applications
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button onClick={onBack} variant="outline" className="flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Applications
          </Button>
          <Badge className={getApplicationStatusColor(application.status)}>
            {application.status.replace('_', ' ')}
          </Badge>
        </div>

        {/* Application Header */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm border-indigo-100 shadow-xl">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-3 text-gray-800">
                  {application.position?.title}
                </CardTitle>
                <div className="flex items-center gap-6 text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    <span className="font-medium text-lg">{application.position?.company}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    <span>{application.position?.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <span>Applied {formatDate(application.appliedAt)}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <Button 
                  onClick={() => onNavigate('job-detail-from-application', application.position?.id)}
                  variant="outline"
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Job Details
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Progress Overview */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm border-indigo-100 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Application Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Overall Completion</span>
                <span className="font-semibold text-indigo-600">{getProgressPercentage()}%</span>
              </div>
              <Progress value={getProgressPercentage()} className="w-full" />
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div className="flex flex-col items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mb-1" />
                  <span className="text-gray-600">Applied</span>
                </div>
                <div className="flex flex-col items-center">
                  {getProgressPercentage() > 0 ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mb-1" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-400 mb-1" />
                  )}
                  <span className="text-gray-600">Assessments</span>
                </div>
                <div className="flex flex-col items-center">
                  {application.status === 'approved' ? (
                    <CheckCircle className="w-5 h-5 text-green-500 mb-1" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-400 mb-1" />
                  )}
                  <span className="text-gray-600">Decision</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Messages */}
        {application.status === 'approved' && (
          <Alert className="border-green-200 bg-green-50 mb-8">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Congratulations!</strong> You have been selected for this position. Check your email for next steps and onboarding information.
            </AlertDescription>
          </Alert>
        )}
        
        {application.status === 'rejected' && (
          <Alert className="border-red-200 bg-red-50 mb-8">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Unfortunately, you were not selected for this position. Don't give up! Continue applying to other opportunities and improving your skills.
            </AlertDescription>
          </Alert>
        )}
        
        {application.status === 'pending' && (
          <Alert className="border-yellow-200 bg-yellow-50 mb-8">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Your application is under review. Complete your assessments below to improve your chances. We'll notify you once a decision has been made.
            </AlertDescription>
          </Alert>
        )}

        {/* Assessments Section */}
        <div className="grid gap-8">
          <Card className="bg-white/80 backdrop-blur-sm border-indigo-100 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-gray-800">Required Assessments</CardTitle>
              <CardDescription>
                Complete both assessments to showcase your skills and improve your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Soft Skills Assessment */}
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Users className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-green-800">Soft Skills Assessment</CardTitle>
                        <CardDescription className="text-green-700">
                          Weight: {application.position?.assessmentWeights?.softSkills || 50}%
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-green-700">Status:</span>
                        <Badge variant="outline" className="text-xs">
                          {application.assessmentStatus?.softSkills === 'completed' ? 'Completed ✓' : 'Not Started'}
                        </Badge>
                      </div>
                      {application.scores?.softSkills && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-green-700">Score:</span>
                          <span className="font-bold text-green-800">{application.scores.softSkills}%</span>
                        </div>
                      )}

                      {/* Show specific soft skills that will be evaluated */}
                      {application.position?.assessmentConfiguration?.selectedSoftSkillsSubAreas && 
                       application.position.assessmentConfiguration.selectedSoftSkillsSubAreas.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-green-800">Skills to be Evaluated:</div>
                          <div className="flex flex-wrap gap-1">
                            {application.position.assessmentConfiguration.selectedSoftSkillsSubAreas.slice(0, 6).map((skill, index) => (
                              <Badge key={index} variant="outline" className="text-xs bg-green-100 border-green-300 text-green-800">
                                {skill}
                              </Badge>
                            ))}
                            {application.position.assessmentConfiguration.selectedSoftSkillsSubAreas.length > 6 && (
                              <Badge variant="outline" className="text-xs bg-gray-100 border-gray-300 text-gray-600">
                                +{application.position.assessmentConfiguration.selectedSoftSkillsSubAreas.length - 6} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => onNavigate('soft-skills')}
                        disabled={application.assessmentStatus?.softSkills === 'completed'}
                      >
                        {application.assessmentStatus?.softSkills === 'completed' ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Completed
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Start Assessment
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Technical Assessment */}
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Code className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-blue-800">Technical Assessment</CardTitle>
                        <CardDescription className="text-blue-700">
                          Weight: {application.position?.assessmentWeights?.technical || 50}%
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-700">Status:</span>
                        <Badge variant="outline" className="text-xs">
                          {application.assessmentStatus?.technical === 'completed' ? 'Completed ✓' : 'Not Started'}
                        </Badge>
                      </div>
                      {application.scores?.technical && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-700">Score:</span>
                          <span className="font-bold text-blue-800">{application.scores.technical}%</span>
                        </div>
                      )}

                      {/* Show specific technical skills that will be evaluated */}
                      {application.position?.assessmentConfiguration?.selectedTechnicalSubSkills && 
                       application.position.assessmentConfiguration.selectedTechnicalSubSkills.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-blue-800">Skills to be Evaluated:</div>
                          <div className="flex flex-wrap gap-1">
                            {application.position.assessmentConfiguration.selectedTechnicalSubSkills.slice(0, 6).map((skill, index) => (
                              <Badge key={index} variant="outline" className="text-xs bg-blue-100 border-blue-300 text-blue-800">
                                {skill}
                              </Badge>
                            ))}
                            {application.position.assessmentConfiguration.selectedTechnicalSubSkills.length > 6 && (
                              <Badge variant="outline" className="text-xs bg-gray-100 border-gray-300 text-gray-600">
                                +{application.position.assessmentConfiguration.selectedTechnicalSubSkills.length - 6} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={() => onNavigate('technical')}
                        disabled={application.assessmentStatus?.technical === 'completed'}
                      >
                        {application.assessmentStatus?.technical === 'completed' ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Completed
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Start Assessment
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}