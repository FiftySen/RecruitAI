import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { supabase } from '../utils/supabase/client';
import { 
  Brain, 
  User, 
  LogOut, 
  CheckCircle, 
  Clock,
  Briefcase,
  Shield,
  MapPin,
  DollarSign,
  Calendar,
  Building,
  Send,
  FileText,
  Search,
  Upload,
  TrendingUp,
  ArrowRight,
  Eye,
  PlayCircle,
  Users,
  Code
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

type Page = 'dashboard' | 'soft-skills' | 'technical' | 'profile' | 'results' | 'admin' | 'jobs' | 'job-detail' | 'application-detail';

interface CandidateDashboardProps {
  onNavigate: (page: Page, jobId?: string, applicationId?: string) => void;
}

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
  requiredSkills: {
    technical: string[];
    software: string[];
  };
  createdAt: string;
  status: 'open' | 'closed';
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

export function CandidateDashboard({ onNavigate }: CandidateDashboardProps) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('jobs');
  const [availableJobs, setAvailableJobs] = useState<JobPosition[]>([]);
  const [userApplications, setUserApplications] = useState<JobApplication[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchAvailableJobs();
      fetchUserApplications();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchAvailableJobs = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/get-job-positions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch jobs');

      const data = await response.json();
      setAvailableJobs(data.positions?.filter((job: JobPosition) => job.status === 'open') || []);
    } catch (error) {
      console.error('Error fetching available jobs:', error);
      toast.error('Failed to load available jobs');
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

      if (!response.ok) throw new Error('Failed to fetch applications');

      const data = await response.json();
      setUserApplications(data.applications || []);
    } catch (error) {
      console.error('Error fetching user applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile || !user?.id) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('userId', user.id);

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/upload-resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('Failed to upload resume');

      const data = await response.json();
      toast.success('Resume uploaded successfully!');
      
      // CHANGED: Return the whole data object (which includes resumeUrl and resumeText)
      return data; 
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast.error('Failed to upload resume. Please try again.');
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleJobApplication = async (jobId: string) => {
    if (!user?.id) return;
    if (!resumeFile) {
      toast.error('Please upload your resume before applying');
      return;
    }

    const alreadyApplied = userApplications.some(app => app.positionId === jobId);
    if (alreadyApplied) {
      toast.error('You have already applied for this position');
      return;
    }

    setApplying(true);
    try {
      // First, upload resume to get the URL and text
      const uploadResult = await handleResumeUpload();
      if (!uploadResult || !uploadResult.resumeUrl || !uploadResult.resumeText) {
        throw new Error("Resume upload failed or did not return required data.");
      }
      
      const { resumeUrl, resumeText } = uploadResult;
      
      // Get the user's session to include the auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("User not authenticated.");

      // Then apply for the job, now including the auth token and resumeText
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/apply-for-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` // <-- THE FIX IS HERE
        },
        body: JSON.stringify({ 
            userId: user.id, 
            positionId: jobId, 
            resumeUrl,
            resumeText 
        })
      });

      if (!response.ok) throw new Error('Failed to apply for job');

      toast.success('Application submitted successfully!');
      fetchUserApplications(); // Refresh the list of applications
      setActiveTab('applications');
      setSelectedJob(null);
      setResumeFile(null);
    } catch (error) {
      console.error('Error applying for job:', error);
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const handleTakeAssessment = (type: 'soft-skills' | 'technical', positionId?: string) => {
    console.log('Attempting to start assessment:', type, 'for positionId:', positionId);
    if (userApplications.length === 0) {
      toast.error('Please apply for a job position before taking assessments');
      setActiveTab('jobs');
      return;
    }
    
    // Store the position ID in localStorage so assessments can be job-specific
    if (positionId) {
      localStorage.setItem('currentAssessmentPositionId', positionId);
    }
    
    onNavigate(type);
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

  const getApplicationStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border border-red-200';
      case 'under_review': return 'bg-blue-100 text-blue-800 border border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getProgressPercentage = (application: JobApplication) => {
    if (!application.assessmentStatus) return 0;
    
    const softSkillsComplete = application.assessmentStatus.softSkills === 'completed';
    const technicalComplete = application.assessmentStatus.technical === 'completed';
    
    let completedCount = 0;
    if (softSkillsComplete) completedCount++;
    if (technicalComplete) completedCount++;
    
    return (completedCount / 2) * 100;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filteredJobs = availableJobs.filter(job =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 text-lg">Loading your dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-indigo-100 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  RecruitAI Career Portal
                </h1>
                <p className="text-gray-600 text-lg mt-1">Find your dream job with AI-powered matching</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={() => onNavigate('profile')} variant="outline" className="border-indigo-200 hover:bg-indigo-50">
                <User className="w-4 h-4 mr-2" />
                My Profile
              </Button>
              <Button 
                variant="outline" 
                onClick={signOut}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Available Jobs</p>
                  <p className="text-3xl font-bold">{availableJobs.length}</p>
                </div>
                <Briefcase className="w-10 h-10 text-blue-100" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Applications</p>
                  <p className="text-3xl font-bold">{userApplications.length}</p>
                </div>
                <Send className="w-10 h-10 text-green-100" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Assessments</p>
                  <p className="text-3xl font-bold">
                    {userApplications.filter(app => getProgressPercentage(app) === 100).length}
                  </p>
                </div>
                <CheckCircle className="w-10 h-10 text-purple-100" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Hired</p>
                  <p className="text-3xl font-bold">
                    {userApplications.filter(app => app.status === 'approved').length}
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-orange-100" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="bg-white/80 backdrop-blur-sm border-indigo-100 shadow-xl">
          <CardContent className="p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
              <TabsList className="grid w-full grid-cols-2 bg-indigo-50 p-1 rounded-xl">
                <TabsTrigger value="jobs" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md rounded-lg">
                  💼 Browse Jobs ({availableJobs.length})
                </TabsTrigger>
                <TabsTrigger value="applications" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md rounded-lg">
                  📋 My Applications ({userApplications.length})
                </TabsTrigger>
              </TabsList>

              {/* Browse Jobs Tab */}
              <TabsContent value="jobs" className="space-y-6">
                {/* Search and Filters */}
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">Available Positions</h2>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search jobs, companies, locations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {filteredJobs.length} jobs
                    </Badge>
                  </div>
                </div>

                {/* Job Listings */}
                <div className="grid gap-6">
                  {filteredJobs.map((job) => {
                    const hasApplied = userApplications.some(app => app.positionId === job.id);
                    return (
                      <Card 
                        key={job.id} 
                        className="hover:shadow-xl transition-all duration-300 border-l-4 border-l-indigo-500 cursor-pointer"
                        onClick={() => setSelectedJob(job)}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-xl mb-3 text-gray-800 hover:text-indigo-600 transition-colors">
                                {job.title}
                              </CardTitle>
                              <div className="flex items-center gap-6 text-gray-600 mb-4">
                                <div className="flex items-center gap-2">
                                  <Building className="w-4 h-4" />
                                  <span className="font-medium">{job.company}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  <span>{job.location}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>{formatDate(job.createdAt)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 mb-4">
                                <Badge className={getJobTypeColor(job.type)}>{job.type}</Badge>
                                {job.salary && (
                                  <Badge variant="outline" className="flex items-center gap-1 border-green-200 text-green-700">
                                    <DollarSign className="w-3 h-3" />
                                    {job.salary}
                                  </Badge>
                                )}
                                {hasApplied && (
                                  <Badge className="bg-green-100 text-green-800 border border-green-200">
                                    Applied ✓
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <ArrowRight className="w-5 h-5 text-gray-400" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-gray-600 mb-4 leading-relaxed line-clamp-2">
                            {job.description}
                          </p>
                          
                          {/* Required Skills Preview */}
                          {job.requiredSkills && (
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {job.requiredSkills.technical.slice(0, 4).map((skill, index) => (
                                  <Badge key={index} variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                    {skill}
                                  </Badge>
                                ))}
                                {job.requiredSkills.technical.length > 4 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{job.requiredSkills.technical.length - 4} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Job Detail Modal */}
                {selectedJob && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white">
                      <CardHeader className="sticky top-0 bg-white border-b">
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-2xl text-gray-800">{selectedJob.title}</CardTitle>
                            <div className="flex items-center gap-4 mt-2 text-gray-600">
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4" />
                                <span className="font-medium">{selectedJob.company}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{selectedJob.location}</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" onClick={() => setSelectedJob(null)}>
                            ✕
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        {/* Job Description */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Job Description</h3>
                          <p className="text-gray-700 leading-relaxed">{selectedJob.description}</p>
                        </div>

                        {/* Required Skills */}
                        {selectedJob.requiredSkills && (
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <h3 className="text-lg font-semibold mb-3">Technical Skills Required</h3>
                              <div className="flex flex-wrap gap-2">
                                {selectedJob.requiredSkills.technical.map((skill, index) => (
                                  <Badge key={index} className="bg-blue-100 text-blue-800 border border-blue-200">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold mb-3">Software Tools</h3>
                              <div className="flex flex-wrap gap-2">
                                {selectedJob.requiredSkills.software.map((tool, index) => (
                                  <Badge key={index} className="bg-green-100 text-green-800 border border-green-200">
                                    {tool}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Assessment Weights */}
                        <div>
                          <h3 className="text-lg font-semibold mb-3">Assessment Structure</h3>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                              <span className="text-blue-800 font-medium">
                                🧠 Soft Skills: {selectedJob.assessmentWeights?.softSkills || 50}%
                              </span>
                            </div>
                            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                              <span className="text-green-800 font-medium">
                                💻 Technical: {selectedJob.assessmentWeights?.technical || 50}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Requirements */}
                        {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                          <div>
                            <h3 className="text-lg font-semibold mb-3">Requirements</h3>
                            <ul className="space-y-2">
                              {selectedJob.requirements.map((req, index) => (
                                <li key={index} className="flex items-start gap-2">
                                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                                  <span className="text-gray-700">{req}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Resume Upload & Apply Section */}
                        <div className="border-t pt-6">
                          <h3 className="text-lg font-semibold mb-4">Apply for this Position</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Upload Your Resume *
                              </label>
                              <div className="flex items-center gap-4">
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                />
                                {resumeFile && (
                                  <Badge className="bg-green-100 text-green-800">
                                    {resumeFile.name}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                Accepted formats: PDF, DOC, DOCX (Max 5MB)
                              </p>
                            </div>
                            
                            <Button 
                              onClick={() => handleJobApplication(selectedJob.id)}
                              disabled={applying || uploading || !resumeFile || userApplications.some(app => app.positionId === selectedJob.id)}
                              size="lg"
                              className="w-full bg-indigo-600 hover:bg-indigo-700"
                            >
                              {applying || uploading ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  {uploading ? 'Uploading Resume...' : 'Submitting Application...'}
                                </>
                              ) : userApplications.some(app => app.positionId === selectedJob.id) ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Already Applied
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4 mr-2" />
                                  Submit Application
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* My Applications Tab */}
              <TabsContent value="applications" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">My Job Applications</h2>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {userApplications.length} applications
                  </Badge>
                </div>
                
                {userApplications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="p-6 bg-gray-50 rounded-lg border border-gray-200">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-600 mb-2">No Applications Yet</h3>
                      <p className="text-gray-500 mb-4">Start your journey by applying to available positions</p>
                      <Button onClick={() => setActiveTab('jobs')} className="bg-indigo-600 hover:bg-indigo-700">
                        Browse Available Jobs
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {userApplications.map((application) => (
                      <Card 
                        key={application.positionId} 
                        className="border-l-4 border-l-green-500 bg-gradient-to-r from-white to-green-50/30 hover:shadow-xl transition-all duration-300 cursor-pointer"
                        onClick={() => onNavigate('application-detail', undefined, application.positionId)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-xl mb-2 text-gray-800 hover:text-indigo-600 transition-colors">
                                {application.position?.title || 'Loading...'}
                              </CardTitle>
                              <div className="flex items-center gap-6 text-gray-600 mb-3">
                                <div className="flex items-center gap-2">
                                  <Building className="w-4 h-4" />
                                  <span className="font-medium">{application.position?.company || 'Loading...'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  <span>{application.position?.location || 'Loading...'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>Applied {formatDate(application.appliedAt)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge className={getApplicationStatusColor(application.status)}>
                                  {application.status.replace('_', ' ')}
                                </Badge>
                                <div className="text-sm text-gray-600">
                                  Assessment Progress: {getProgressPercentage(application)}% Complete
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-500">View Details</span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <h4 className="text-sm font-medium text-gray-700">Take Assessments</h4>
                              <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTakeAssessment('soft-skills', application.positionId);
                                }}
                                disabled={application.assessmentStatus?.softSkills === 'completed'}
                                className="flex items-center gap-1"
                              >
                                <Users className="w-3 h-3" />
                                Soft Skills
                                {application.assessmentStatus?.softSkills === 'completed' && (
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTakeAssessment('technical', application.positionId);
                                }}
                                disabled={application.assessmentStatus?.technical === 'completed'}
                                className="flex items-center gap-1"
                              >
                                <Code className="w-3 h-3" />
                                Technical
                                {application.assessmentStatus?.technical === 'completed' && (
                                  <CheckCircle className="w-3 h-3 text-green-600" />
                                )}
                              </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}