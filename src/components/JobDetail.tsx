import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  ArrowLeft,
  Building,
  MapPin,
  DollarSign,
  Calendar,
  Users,
  Code,
  CheckCircle,
  Send,
  Clock
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
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  assessmentWeights: {
    softSkills: number;
    technical: number;
  };
  requiredSkills?: {
    softSkills: string[];
    technical: string[];
    software: string[];
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
  status: 'open' | 'closed';
}

interface JobDetailProps {
  jobId: string;
  onBack: () => void;
  onApply: () => void;
}

export function JobDetail({ jobId, onBack, onApply }: JobDetailProps) {
  const { user } = useAuth();
  const [job, setJob] = useState<JobPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);

  useEffect(() => {
    fetchJobDetails();
    checkApplicationStatus();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/get-job-positions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch job details');

      const data = await response.json();
      const jobDetails = data.positions?.find((job: JobPosition) => job.id === jobId);
      setJob(jobDetails || null);
    } catch (error) {
      console.error('Error fetching job details:', error);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const checkApplicationStatus = async () => {
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

      if (!response.ok) throw new Error('Failed to check application status');

      const data = await response.json();
      const hasAppliedToJob = data.applications?.some((app: any) => app.positionId === jobId);
      setHasApplied(hasAppliedToJob || false);
    } catch (error) {
      console.error('Error checking application status:', error);
    }
  };

  const handleApply = async () => {
    if (!user?.id || !job) return;

    setApplying(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/apply-for-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ userId: user.id, positionId: job.id })
      });

      if (!response.ok) throw new Error('Failed to apply for job');

      toast.success('Application submitted successfully!');
      setHasApplied(true);
      onApply(); // Callback to refresh parent component
    } catch (error) {
      console.error('Error applying for job:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const getJobTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'full-time': return 'bg-emerald-100 text-emerald-800 border border-emerald-200';
      case 'part-time': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'contract': return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'internship': return 'bg-purple-100 text-purple-800 border border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
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
              <p className="mt-4 text-gray-600">Loading job details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Job Not Found</h2>
            <p className="text-gray-600 mb-6">The job you're looking for doesn't exist or has been removed.</p>
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Jobs
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
            Back to Jobs
          </Button>
          <Badge className={getJobTypeColor(job.type)}>
            {job.type}
          </Badge>
        </div>

        {/* Job Header */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm border-indigo-100 shadow-xl">
          <CardHeader className="pb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-3xl mb-3 text-gray-800">{job.title}</CardTitle>
                <div className="flex items-center gap-6 text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    <span className="font-medium text-lg">{job.company}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    <span>Posted {formatDate(job.createdAt)}</span>
                  </div>
                </div>
                {job.salary && (
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-700 text-lg">{job.salary}</span>
                  </div>
                )}
              </div>
              <div className="text-right">
                {hasApplied ? (
                  <Badge className="bg-green-100 text-green-800 border border-green-200 px-6 py-3 text-base">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Applied ✓
                  </Badge>
                ) : (
                  <Button 
                    onClick={handleApply}
                    disabled={applying}
                    size="lg"
                    className="bg-indigo-600 hover:bg-indigo-700 px-8 py-3 text-base"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    {applying ? 'Applying...' : 'Apply Now'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Job Details */}
        <div className="grid gap-8">
          {/* Description */}
          <Card className="bg-white/80 backdrop-blur-sm border-indigo-100 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-gray-800">Job Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed text-base">{job.description}</p>
            </CardContent>
          </Card>

          {/* Requirements & Responsibilities */}
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-white/80 backdrop-blur-sm border-indigo-100 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-gray-800">Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                {job.requirements && job.requirements.length > 0 ? (
                  <ul className="space-y-2">
                    {job.requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">{req}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No specific requirements listed.</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur-sm border-indigo-100 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-gray-800">Responsibilities</CardTitle>
              </CardHeader>
              <CardContent>
                {job.responsibilities && job.responsibilities.length > 0 ? (
                  <ul className="space-y-2">
                    {job.responsibilities.map((resp, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">{resp}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No specific responsibilities listed.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Benefits */}
          {job.benefits && job.benefits.length > 0 && (
            <Card className="bg-white/80 backdrop-blur-sm border-indigo-100 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-gray-800">Benefits & Perks</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid md:grid-cols-2 gap-2">
                  {job.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Assessment Information */}
          <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-indigo-800 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Assessment Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-indigo-700 mb-4">
                This position requires completion of AI-powered assessments to evaluate your fit. The assessment areas have been customized based on the role requirements.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/80 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-800">Soft Skills Assessment</span>
                  </div>
                  <p className="text-sm text-blue-700 mb-3">
                    Weight: {job.assessmentWeights?.softSkills || 50}% of total evaluation
                  </p>
                  
                  {/* Show main soft skills areas */}
                  {(job.assessmentConfiguration?.softSkillsAreas || job.requiredSkills?.softSkills) && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-blue-800">Main Assessment Areas:</div>
                      <div className="flex flex-wrap gap-1">
                        {(job.assessmentConfiguration?.softSkillsAreas || job.requiredSkills?.softSkills || []).map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show specific sub-skills if configured */}
                  {job.assessmentConfiguration?.selectedSoftSkillsSubAreas && job.assessmentConfiguration.selectedSoftSkillsSubAreas.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <div className="text-xs font-medium text-blue-800">Specific Skills to be Evaluated:</div>
                      <div className="flex flex-wrap gap-1">
                        {job.assessmentConfiguration.selectedSoftSkillsSubAreas.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-blue-100 border-blue-300 text-blue-800 font-medium">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show custom soft skills if any */}
                  {job.assessmentConfiguration?.customSoftSkills && job.assessmentConfiguration.customSoftSkills.trim() && (
                    <div className="space-y-2 mt-3">
                      <div className="text-xs font-medium text-blue-800">Additional Custom Skills:</div>
                      <div className="flex flex-wrap gap-1">
                        {job.assessmentConfiguration.customSoftSkills.split('\n').filter(skill => skill.trim()).map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                            {skill.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="bg-white/80 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">Technical Assessment</span>
                  </div>
                  <p className="text-sm text-green-700 mb-3">
                    Weight: {job.assessmentWeights?.technical || 50}% of total evaluation
                  </p>
                  
                  {/* Show main technical areas */}
                  {(job.assessmentConfiguration?.technicalAreas || job.requiredSkills?.technical) && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-green-800">Main Assessment Areas:</div>
                      <div className="flex flex-wrap gap-1">
                        {(job.assessmentConfiguration?.technicalAreas || job.requiredSkills?.technical || []).map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show specific technical sub-skills if configured */}
                  {job.assessmentConfiguration?.selectedTechnicalSubSkills && job.assessmentConfiguration.selectedTechnicalSubSkills.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <div className="text-xs font-medium text-green-800">Specific Skills to be Evaluated:</div>
                      <div className="flex flex-wrap gap-1">
                        {job.assessmentConfiguration.selectedTechnicalSubSkills.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-green-100 border-green-300 text-green-800 font-medium">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show custom technical skills if any */}
                  {job.assessmentConfiguration?.customTechnicalSkills && job.assessmentConfiguration.customTechnicalSkills.trim() && (
                    <div className="space-y-2 mt-3">
                      <div className="text-xs font-medium text-green-800">Additional Custom Skills:</div>
                      <div className="flex flex-wrap gap-1">
                        {job.assessmentConfiguration.customTechnicalSkills.split('\n').filter(skill => skill.trim()).map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                            {skill.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show software skills from old format if no assessmentConfiguration */}
                  {!job.assessmentConfiguration?.customTechnicalSkills && job.requiredSkills?.software && job.requiredSkills.software.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <div className="text-xs font-medium text-green-800">Software & Tools:</div>
                      <div className="flex flex-wrap gap-1">
                        {job.requiredSkills.software.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-purple-50 border-purple-200 text-purple-700">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <h4 className="font-semibold mb-2 text-amber-800">What to Expect:</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-blue-800 mb-1">Soft Skills Assessment:</div>
                    <ul className="text-amber-700 space-y-1">
                      <li>• Scenario-based behavioral questions</li>
                      <li>• Interactive AI conversation</li>
                      <li>• Real-world problem-solving scenarios</li>
                      <li>• Duration: 20-30 minutes</li>
                    </ul>
                  </div>
                  <div>
                    <div className="font-medium text-green-800 mb-1">Technical Assessment:</div>
                    <ul className="text-amber-700 space-y-1">
                      <li>• Technical problem-solving questions</li>
                      <li>• Code analysis and optimization</li>
                      <li>• System design discussions</li>
                      <li>• Duration: 45-60 minutes</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Tips for candidates */}
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <h4 className="font-semibold mb-2 text-indigo-800">💡 Preparation Tips:</h4>
                <div className="text-sm text-indigo-700 space-y-1">
                  <p>• Review the specific skills listed above - they will guide the assessment questions</p>
                  <p>• Prepare real examples from your experience for each skill area</p>
                  <p>• Practice explaining your thought process clearly and concisely</p>
                  <p>• The AI will adapt questions based on your responses, so be authentic</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Required Skills */}
          {job.requiredSkills && (
            <Card className="bg-white/80 backdrop-blur-sm border-indigo-100 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-gray-800">Required Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid md:grid-cols-2 gap-2">
                  {job.requiredSkills.softSkills.map((skill, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">{skill}</span>
                    </li>
                  ))}
                  {job.requiredSkills.technical.map((skill, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">{skill}</span>
                    </li>
                  ))}
                  {job.requiredSkills.software.map((skill, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">{skill}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}