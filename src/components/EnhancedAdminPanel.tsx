import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Separator } from './ui/separator';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Checkbox } from './ui/checkbox';
import { ArrowLeft, Plus, Edit2, Trash2, Users, Briefcase, TrendingUp, Award, MapPin, DollarSign, Calendar, Eye, Download, User, FileText, Mail, Phone, MapPinIcon, Building, Shield, AlertTriangle, LogOut, Bot, Cpu, Settings, Brain, Target, CheckCircle2, Filter, Copy } from 'lucide-react';
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
  updatedAt: string;
  status: 'open' | 'closed';
}

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  experience: string;
  skills: string;
  education: string;
  resumeUrl?: string;
}

interface RankedCandidate {
  userId: string;
  profile: UserProfile;
  assessments: {
    softSkills: any;
    technical: any;
  };
  application: any;
  scores: {
    softSkills: number;
    technical: number;
    weighted: number;
    bertScore?: number;
  };
}

interface EnhancedAdminPanelProps {
  onBack: () => void;
}

export function EnhancedAdminPanel({ onBack }: EnhancedAdminPanelProps) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('positions');
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [rankedCandidates, setRankedCandidates] = useState<RankedCandidate[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<JobPosition | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<RankedCandidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPosition, setEditingPosition] = useState<JobPosition | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);

  // Form state for creating/editing positions
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    type: 'full-time',
    salary: '',
    description: '',
    requirements: '',
    responsibilities: '',
    benefits: '',
    softSkillsWeight: 50,
    technicalWeight: 50,
    status: 'open' as 'open' | 'closed'
  });

  // Assessment Configuration State
  const [assessmentConfig, setAssessmentConfig] = useState({
    selectedSoftSkillsAreas: [] as string[],
    selectedTechnicalAreas: [] as string[],
    selectedSoftSkillsSubAreas: {} as Record<string, string[]>, // New: track sub-skills for soft skills
    selectedTechnicalSubSkills: {} as Record<string, string[]>, // New: track sub-skills for each area
    customSoftSkills: '', // Separate custom fields
    customTechnicalSkills: ''
  });

  // Predefined Assessment Areas
  const SOFT_SKILLS_AREAS = {
    'Communication': [
      'Verbal Communication',
      'Written Communication', 
      'Active Listening',
      'Presentation Skills',
      'Cross-cultural Communication',
      'Conflict Resolution',
      'Public Speaking',
      'Documentation',
      'Technical Writing',
      'Client Communication'
    ],
    'Leadership': [
      'Team Leadership',
      'Strategic Thinking',
      'Decision Making',
      'Mentoring',
      'Change Management',
      'Vision Setting',
      'Delegation',
      'Performance Management',
      'Coaching',
      'Influence & Persuasion'
    ],
    'Problem Solving': [
      'Analytical Thinking',
      'Creative Problem Solving',
      'Critical Thinking',
      'Root Cause Analysis',
      'Systems Thinking',
      'Innovation',
      'Troubleshooting',
      'Research Skills',
      'Logic & Reasoning',
      'Pattern Recognition'
    ],
    'Collaboration': [
      'Teamwork',
      'Cross-functional Collaboration',
      'Stakeholder Management',
      'Negotiation',
      'Consensus Building',
      'Partnership Building',
      'Knowledge Sharing',
      'Peer Review',
      'Agile Collaboration',
      'Remote Teamwork'
    ],
    'Adaptability': [
      'Change Adaptation',
      'Learning Agility',
      'Flexibility',
      'Resilience',
      'Stress Management',
      'Growth Mindset',
      'Continuous Learning',
      'Technology Adoption',
      'Cultural Adaptability',
      'Innovation Mindset'
    ],
    'Time Management': [
      'Prioritization',
      'Project Management',
      'Deadline Management',
      'Multitasking',
      'Planning',
      'Efficiency',
      'Resource Management',
      'Goal Setting',
      'Task Organization',
      'Work-Life Balance'
    ]
  };

  const TECHNICAL_AREAS = {
    'Frontend Development': [
      'React',
      'Vue.js',
      'Angular',
      'JavaScript/TypeScript',
      'HTML/CSS',
      'Responsive Design',
      'UI/UX Principles',
      'Frontend Testing',
      'State Management',
      'Performance Optimization'
    ],
    'Backend Development': [
      'Node.js',
      'Python',
      'Java',
      'C#',
      'Go',
      'API Development',
      'Microservices',
      'Authentication & Security',
      'Server Architecture',
      'Performance Tuning'
    ],
    'Database & Data': [
      'SQL Databases',
      'NoSQL Databases',
      'Data Modeling',
      'Database Optimization',
      'Data Migration',
      'Data Warehousing',
      'ETL Processes',
      'Database Security',
      'Backup & Recovery',
      'Query Optimization'
    ],
    'Cloud & DevOps': [
      'AWS',
      'Azure',
      'Google Cloud Platform',
      'Docker',
      'Kubernetes',
      'CI/CD Pipelines',
      'Infrastructure as Code',
      'Monitoring & Logging',
      'Security & Compliance',
      'Automation'
    ],
    'Data Science & AI': [
      'Machine Learning',
      'Deep Learning',
      'Data Analysis',
      'Statistical Modeling',
      'Python/R for Data Science',
      'Data Visualization',
      'Natural Language Processing',
      'Computer Vision',
      'Big Data Technologies',
      'AI Model Deployment'
    ],
    'Mobile Development': [
      'React Native',
      'Flutter',
      'iOS Development (Swift)',
      'Android Development (Kotlin/Java)',
      'Mobile UI/UX',
      'App Store Optimization',
      'Mobile Testing',
      'Performance Optimization',
      'Push Notifications',
      'Mobile Security'
    ],
    'Product & Design': [
      'Product Strategy',
      'User Research',
      'UI/UX Design',
      'Product Analytics',
      'A/B Testing',
      'Design Systems',
      'Prototyping',
      'User Testing',
      'Product Roadmapping',
      'Design Tools (Figma, Sketch)'
    ],
    'Quality Assurance': [
      'Test Planning',
      'Manual Testing',
      'Automated Testing',
      'Performance Testing',
      'Security Testing',
      'API Testing',
      'Test Case Design',
      'Bug Tracking',
      'Test Automation Frameworks',
      'Quality Metrics'
    ],
    'Human Resources': [
      'Talent Acquisition',
      'Employee Relations',
      'Performance Management',
      'Compensation & Benefits',
      'HR Information Systems',
      'Employment Law',
      'Training & Development',
      'Organizational Development',
      'HR Analytics',
      'Workforce Planning'
    ],
    'Research & Development': [
      'Research Methodology',
      'Technical Documentation',
      'Innovation Management',
      'Prototype Development',
      'Technology Evaluation',
      'Patent Research',
      'Scientific Writing',
      'Experimental Design',
      'Technology Transfer',
      'R&D Project Management'
    ]
  };

  const JOB_TEMPLATES = {
    'Software Engineer': {
      softSkills: ['Communication', 'Problem Solving', 'Collaboration', 'Adaptability'],
      technical: ['Frontend Development', 'Backend Development']
    },
    'Data Scientist': {
      softSkills: ['Problem Solving', 'Communication', 'Time Management'],
      technical: ['Data Science & AI', 'Database & Data']
    },
    'DevOps Engineer': {
      softSkills: ['Problem Solving', 'Collaboration', 'Adaptability'],
      technical: ['Cloud & DevOps', 'Backend Development']
    },
    'Product Manager': {
      softSkills: ['Leadership', 'Communication', 'Problem Solving', 'Collaboration'],
      technical: ['Product & Design']
    },
    'Mobile Developer': {
      softSkills: ['Problem Solving', 'Communication', 'Adaptability'],
      technical: ['Mobile Development', 'Frontend Development']
    },
    'Frontend Developer': {
      softSkills: ['Communication', 'Problem Solving', 'Collaboration'],
      technical: ['Frontend Development', 'Product & Design']
    },
    'Backend Developer': {
      softSkills: ['Problem Solving', 'Communication', 'Time Management'],
      technical: ['Backend Development', 'Database & Data']
    },
    'QA Engineer': {
      softSkills: ['Problem Solving', 'Communication', 'Time Management', 'Collaboration'],
      technical: ['Quality Assurance', 'Frontend Development']
    },
    'HR Manager': {
      softSkills: ['Leadership', 'Communication', 'Collaboration', 'Problem Solving'],
      technical: ['Human Resources']
    },
    'Research Engineer': {
      softSkills: ['Problem Solving', 'Communication', 'Adaptability', 'Time Management'],
      technical: ['Research & Development', 'Data Science & AI']
    },
    'UI/UX Designer': {
      softSkills: ['Communication', 'Problem Solving', 'Collaboration', 'Adaptability'],
      technical: ['Product & Design', 'Frontend Development']
    },
    'Data Engineer': {
      softSkills: ['Problem Solving', 'Communication', 'Time Management'],
      technical: ['Database & Data', 'Cloud & DevOps']
    }
  };

  // Check if user is admin - redirect if not
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-red-50 to-orange-50 border-red-200">
            <CardContent className="p-8">
              <div className="text-center">
                <div className="p-4 bg-red-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  You don't have administrator privileges to access this panel. Only admin users can manage job positions and view candidate rankings.
                </p>
                <div className="flex justify-center gap-4">
                  <Button onClick={onBack} className="bg-blue-600 hover:bg-blue-700">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                  <Button variant="outline" onClick={signOut} className="border-gray-300">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchJobPositions();
  }, []);

  const fetchJobPositions = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/get-job-positions`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch positions error response:', errorText);
        throw new Error(`Failed to fetch positions: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Fetched positions:', data);
      setPositions(data.positions || []);
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast.error('Failed to load job positions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRankedCandidates = async (positionId: string) => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/get-ranked-candidates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || publicAnonKey}`
        },
        body: JSON.stringify({ positionId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch candidates error response:', errorText);
        throw new Error(`Failed to fetch candidates: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setRankedCandidates(data.candidates || []);
      setSelectedPosition(data.position);
      setActiveTab('rankings');
    } catch (error) {
      console.error('Error fetching candidates:', error);
      toast.error('Failed to load candidates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadResume = async (candidate: RankedCandidate) => {
    if (!candidate.profile?.resumeUrl) {
      toast.error('No resume available for this candidate');
      return;
    }

    try {
      // Get a fresh signed URL for the resume
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/get-resume-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || publicAnonKey}`
        },
        body: JSON.stringify({ userId: candidate.userId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Get resume URL error response:', errorText);
        throw new Error(`Failed to get resume URL: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.resumeUrl) {
        window.open(data.resumeUrl, '_blank');
      } else {
        toast.error('Resume not found');
      }
    } catch (error) {
      console.error('Error downloading resume:', error);
      toast.error('Failed to download resume. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      company: '',
      location: '',
      type: 'full-time',
      salary: '',
      description: '',
      requirements: '',
      responsibilities: '',
      benefits: '',
      softSkillsWeight: 50,
      technicalWeight: 50,
      status: 'open'
    });
    setAssessmentConfig({
      selectedSoftSkillsAreas: [],
      selectedTechnicalAreas: [],
      selectedSoftSkillsSubAreas: {},
      selectedTechnicalSubSkills: {},
      customSoftSkills: '',
      customTechnicalSkills: ''
    });
  };

  const saveJobPosition = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // Build selected sub-skills for soft skills
      const selectedSoftSkillsSubAreas: string[] = [];
      Object.keys(assessmentConfig.selectedSoftSkillsSubAreas).forEach(area => {
        const subSkills = assessmentConfig.selectedSoftSkillsSubAreas[area] || [];
        selectedSoftSkillsSubAreas.push(...subSkills);
      });

      // Build selected sub-skills for technical areas  
      const selectedTechnicalSubSkills: string[] = [];
      Object.keys(assessmentConfig.selectedTechnicalSubSkills).forEach(area => {
        const subSkills = assessmentConfig.selectedTechnicalSubSkills[area] || [];
        selectedTechnicalSubSkills.push(...subSkills);
      });

      const positionData = {
        title: formData.title,
        company: formData.company,
        location: formData.location,
        type: formData.type,
        salary: formData.salary,
        description: formData.description,
        requirements: formData.requirements.split('\n').filter(r => r.trim()),
        responsibilities: formData.responsibilities.split('\n').filter(r => r.trim()),
        benefits: formData.benefits.split('\n').filter(b => b.trim()),
        assessmentWeights: {
          softSkills: formData.softSkillsWeight,
          technical: formData.technicalWeight
        },
        requiredSkills: {
          softSkills: assessmentConfig.selectedSoftSkillsAreas.map(s => s.trim()),
          technical: assessmentConfig.selectedTechnicalAreas.map(s => s.trim()),
          software: assessmentConfig.customTechnicalSkills.split('\n').filter(s => s.trim()).map(s => s.trim())
        },
        // NEW: Save detailed assessment configuration including sub-skills
        assessmentConfiguration: {
          softSkillsAreas: assessmentConfig.selectedSoftSkillsAreas,
          technicalAreas: assessmentConfig.selectedTechnicalAreas,
          softSkillsSubAreas: assessmentConfig.selectedSoftSkillsSubAreas,
          technicalSubSkills: assessmentConfig.selectedTechnicalSubSkills,
          selectedSoftSkillsSubAreas: selectedSoftSkillsSubAreas,
          selectedTechnicalSubSkills: selectedTechnicalSubSkills,
          customSoftSkills: assessmentConfig.customSoftSkills,
          customTechnicalSkills: assessmentConfig.customTechnicalSkills
        },
        status: formData.status
      };

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/save-job-position`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || publicAnonKey}`
        },
        body: JSON.stringify({
          positionId: editingPosition?.id,
          position: positionData
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save position error response:', errorText);
        throw new Error(`Failed to save position: ${response.status} ${response.statusText}`);
      }

      toast.success(editingPosition ? 'Position updated successfully!' : 'Position created successfully!');
      
      resetForm();
      setEditingPosition(null);
      setIsCreateDialogOpen(false);
      setIsEditDialogOpen(false);
      fetchJobPositions();
    } catch (error) {
      console.error('Error saving position:', error);
      toast.error('Failed to save position. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteJobPosition = async (positionId: string) => {
    if (!user?.id) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/delete-job-position`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || publicAnonKey}`
        },
        body: JSON.stringify({ positionId })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete position error response:', errorText);
        throw new Error(`Failed to delete position: ${response.status} ${response.statusText}`);
      }

      toast.success('Position deleted successfully!');
      fetchJobPositions();
    } catch (error) {
      console.error('Error deleting position:', error);
      toast.error('Failed to delete position. Please try again.');
    }
  };

  const openEditDialog = (position: JobPosition) => {
    setEditingPosition(position);
    setFormData({
      title: position.title,
      company: position.company,
      location: position.location,
      type: position.type,
      salary: position.salary,
      description: position.description,
      requirements: position.requirements?.join('\n') || '',
      responsibilities: position.responsibilities?.join('\n') || '',
      benefits: position.benefits?.join('\n') || '',
      softSkillsWeight: position.assessmentWeights?.softSkills || 50,
      technicalWeight: position.assessmentWeights?.technical || 50,
      status: position.status
    });
    
    // Load existing assessment configuration - prioritize assessmentConfiguration over requiredSkills
    if (position.assessmentConfiguration) {
      // Load from the detailed assessment configuration
      setAssessmentConfig({
        selectedSoftSkillsAreas: position.assessmentConfiguration.softSkillsAreas || [],
        selectedTechnicalAreas: position.assessmentConfiguration.technicalAreas || [],
        selectedSoftSkillsSubAreas: position.assessmentConfiguration.softSkillsSubAreas || {},
        selectedTechnicalSubSkills: position.assessmentConfiguration.technicalSubSkills || {},
        customSoftSkills: position.assessmentConfiguration.customSoftSkills || '',
        customTechnicalSkills: position.assessmentConfiguration.customTechnicalSkills || ''
      });
    } else if (position.requiredSkills) {
      // Fallback to the old format for backwards compatibility
      setAssessmentConfig({
        selectedSoftSkillsAreas: position.requiredSkills.softSkills || [],
        selectedTechnicalAreas: position.requiredSkills.technical || [],
        selectedSoftSkillsSubAreas: {},
        selectedTechnicalSubSkills: {},
        customSoftSkills: '',
        customTechnicalSkills: position.requiredSkills.software?.join('\n') || ''
      });
    } else {
      // Reset to empty if no configuration exists
      setAssessmentConfig({
        selectedSoftSkillsAreas: [],
        selectedTechnicalAreas: [],
        selectedSoftSkillsSubAreas: {},
        selectedTechnicalSubSkills: {},
        customSoftSkills: '',
        customTechnicalSkills: ''
      });
    }
    
    setIsEditDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingPosition(null);
    setIsCreateDialogOpen(true);
  };

  const openCandidateDialog = (candidate: RankedCandidate) => {
    setSelectedCandidate(candidate);
    setIsCandidateDialogOpen(true);
  };

  const handleWeightChange = (type: 'softSkills' | 'technical', value: number) => {
    if (type === 'softSkills') {
      setFormData(prev => ({
        ...prev,
        softSkillsWeight: value,
        technicalWeight: 100 - value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        technicalWeight: value,
        softSkillsWeight: 100 - value
      }));
    }
  };

  // Assessment Configuration Helper Functions
  const applyJobTemplate = (templateName: string) => {
    const template = JOB_TEMPLATES[templateName as keyof typeof JOB_TEMPLATES];
    if (template) {
      setAssessmentConfig(prev => ({
        ...prev,
        selectedSoftSkillsAreas: template.softSkills,
        selectedTechnicalAreas: template.technical
      }));
      toast.success(`Applied ${templateName} template successfully!`);
    }
  };

  const toggleSoftSkillsArea = (area: string) => {
    setAssessmentConfig(prev => {
      const isSelected = prev.selectedSoftSkillsAreas.includes(area);
      const newSelectedAreas = isSelected
        ? prev.selectedSoftSkillsAreas.filter(item => item !== area)
        : [...prev.selectedSoftSkillsAreas, area];
      
      // If deselecting, remove sub-skills for this area
      const newSubSkills = { ...prev.selectedSoftSkillsSubAreas };
      if (isSelected) {
        delete newSubSkills[area];
      } else {
        // If selecting, initialize with empty array (no sub-skills selected by default)
        newSubSkills[area] = [];
      }
      
      return {
        ...prev,
        selectedSoftSkillsAreas: newSelectedAreas,
        selectedSoftSkillsSubAreas: newSubSkills
      };
    });
  };

  const toggleSoftSkillsSubArea = (area: string, subSkill: string) => {
    setAssessmentConfig(prev => {
      const currentSubSkills = prev.selectedSoftSkillsSubAreas[area] || [];
      const newSubSkills = currentSubSkills.includes(subSkill)
        ? currentSubSkills.filter(skill => skill !== subSkill)
        : [...currentSubSkills, subSkill];
      
      return {
        ...prev,
        selectedSoftSkillsSubAreas: {
          ...prev.selectedSoftSkillsSubAreas,
          [area]: newSubSkills
        }
      };
    });
  };

  const toggleTechnicalArea = (area: string) => {
    setAssessmentConfig(prev => {
      const isSelected = prev.selectedTechnicalAreas.includes(area);
      const newSelectedAreas = isSelected
        ? prev.selectedTechnicalAreas.filter(item => item !== area)
        : [...prev.selectedTechnicalAreas, area];
      
      // If deselecting, remove sub-skills for this area
      const newSubSkills = { ...prev.selectedTechnicalSubSkills };
      if (isSelected) {
        delete newSubSkills[area];
      } else {
        // If selecting, initialize with empty array (no sub-skills selected by default)
        newSubSkills[area] = [];
      }
      
      return {
        ...prev,
        selectedTechnicalAreas: newSelectedAreas,
        selectedTechnicalSubSkills: newSubSkills
      };
    });
  };

  const toggleTechnicalSubSkill = (area: string, subSkill: string) => {
    setAssessmentConfig(prev => {
      const currentSubSkills = prev.selectedTechnicalSubSkills[area] || [];
      const newSubSkills = currentSubSkills.includes(subSkill)
        ? currentSubSkills.filter(skill => skill !== subSkill)
        : [...currentSubSkills, subSkill];
      
      return {
        ...prev,
        selectedTechnicalSubSkills: {
          ...prev.selectedTechnicalSubSkills,
          [area]: newSubSkills
        }
      };
    });
  };

  const generateAssessmentSkillsList = () => {
    const softSkills: string[] = [];
    const technicalSkills: string[] = [];

    // Add selected soft skills areas
    assessmentConfig.selectedSoftSkillsAreas.forEach(area => {
      if (SOFT_SKILLS_AREAS[area as keyof typeof SOFT_SKILLS_AREAS]) {
        softSkills.push(...SOFT_SKILLS_AREAS[area as keyof typeof SOFT_SKILLS_AREAS]);
      }
    });

    // Add selected technical areas
    assessmentConfig.selectedTechnicalAreas.forEach(area => {
      if (TECHNICAL_AREAS[area as keyof typeof TECHNICAL_AREAS]) {
        technicalSkills.push(...TECHNICAL_AREAS[area as keyof typeof TECHNICAL_AREAS]);
      }
    });

    // Add custom skills
    if (assessmentConfig.customSoftSkills.trim()) {
      softSkills.push(...assessmentConfig.customSoftSkills.split('\n').filter(s => s.trim()));
    }

    if (assessmentConfig.customTechnicalSkills.trim()) {
      technicalSkills.push(...assessmentConfig.customTechnicalSkills.split('\n').filter(s => s.trim()));
    }

    return { softSkills, technicalSkills };
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${type} skills copied to clipboard!`);
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

  const getStatusColor = (status: 'open' | 'closed') => {
    return status === 'open' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200';
  };

  const getResumeScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderPositionForm = () => (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto">
      {/* Basic Information */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title">Job Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Senior Software Engineer"
            />
          </div>
          <div>
            <Label htmlFor="company">Company *</Label>
            <Input
              id="company"
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              placeholder="TechCorp Inc."
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="New York, NY"
            />
          </div>
          <div>
            <Label htmlFor="type">Job Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full-time">Full-time</SelectItem>
                <SelectItem value="part-time">Part-time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="internship">Internship</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="salary">Salary Range</Label>
            <Input
              id="salary"
              value={formData.salary}
              onChange={(e) => setFormData(prev => ({ ...prev, salary: e.target.value }))}
              placeholder="$80,000 - $120,000"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Job Description *</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Detailed job description..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="requirements">Requirements (one per line)</Label>
            <Textarea
              id="requirements"
              value={formData.requirements}
              onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
              placeholder="Bachelor's degree in Computer Science&#10;5+ years of experience&#10;Proficiency in React"
              rows={4}
            />
          </div>
          <div>
            <Label htmlFor="responsibilities">Responsibilities (one per line)</Label>
            <Textarea
              id="responsibilities"
              value={formData.responsibilities}
              onChange={(e) => setFormData(prev => ({ ...prev, responsibilities: e.target.value }))}
              placeholder="Develop frontend applications&#10;Collaborate with design team&#10;Code reviews"
              rows={4}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="benefits">Benefits (one per line)</Label>
          <Textarea
            id="benefits"
            value={formData.benefits}
            onChange={(e) => setFormData(prev => ({ ...prev, benefits: e.target.value }))}
            placeholder="Health insurance&#10;401k matching&#10;Remote work options"
            rows={3}
          />
        </div>
      </div>

      {/* Assessment Configuration */}
      <div className="space-y-4 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
        <div className="text-center">
          <h3 className="text-lg font-bold text-gray-800 mb-2">🎯 Assessment Configuration</h3>
          <p className="text-sm text-gray-600 mb-4">Configure skill areas for AI-powered assessments</p>
        </div>
        
        {/* Assessment Weights */}
        <div className="bg-white p-4 rounded-lg border">
          <Label className="text-sm font-medium mb-3 block">Assessment Weight Distribution</Label>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm">Soft Skills: {formData.softSkillsWeight}%</span>
                <span className="text-sm">Technical: {formData.technicalWeight}%</span>
              </div>
              <Slider
                value={[formData.softSkillsWeight]}
                onValueChange={(value) => handleWeightChange('softSkills', value[0])}
                max={100}
                step={5}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Job Role Templates */}
        <div className="bg-white p-4 rounded-lg border">
          <Label className="text-sm font-medium mb-3 block">⚡ Quick Start Templates</Label>
          <div className="grid grid-cols-3 gap-2">
            {Object.keys(JOB_TEMPLATES).map((template) => (
              <Button
                key={template}
                variant="outline"
                size="sm"
                onClick={() => applyJobTemplate(template)}
                className="text-xs p-2 h-auto"
              >
                {template}
              </Button>
            ))}
          </div>
        </div>

        {/* Skills Configuration - Soft Skills Area -> Custom Soft Skills -> Technical Area -> Custom Technical Skills */}
        <div className="space-y-4">
          {/* Soft Skills Areas */}
          <div className="bg-white p-4 rounded-lg border">
            <Label className="text-sm font-medium mb-3 block text-blue-700">🧠 Soft Skills Areas</Label>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Object.entries(SOFT_SKILLS_AREAS).map(([category, skills]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                    <Checkbox
                      id={`soft-${category}`}
                      checked={assessmentConfig.selectedSoftSkillsAreas.includes(category)}
                      onCheckedChange={() => toggleSoftSkillsArea(category)}
                    />
                    <Label htmlFor={`soft-${category}`} className="text-sm cursor-pointer font-medium">
                      {category}
                    </Label>
                  </div>
                  
                  {/* Sub-skills selection - only show if area is selected */}
                  {assessmentConfig.selectedSoftSkillsAreas.includes(category) && (
                    <div className="ml-6 space-y-1 border-l-2 border-blue-200 pl-3">
                      <div className="text-xs text-blue-600 mb-1">Select specific skills:</div>
                      <div className="grid grid-cols-2 gap-1">
                        {skills.map((skill) => (
                          <div key={skill} className="flex items-center space-x-1">
                            <Checkbox
                              id={`soft-sub-${category}-${skill}`}
                              checked={assessmentConfig.selectedSoftSkillsSubAreas[category]?.includes(skill) || false}
                              onCheckedChange={() => toggleSoftSkillsSubArea(category, skill)}
                              className="h-3 w-3"
                            />
                            <Label 
                              htmlFor={`soft-sub-${category}-${skill}`} 
                              className="text-xs cursor-pointer leading-tight"
                            >
                              {skill}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Custom Soft Skills */}
          <div className="bg-white p-4 rounded-lg border">
            <Label htmlFor="customSoftSkills" className="text-sm font-medium mb-2 block text-blue-700">🔧 Custom Soft Skills (one per line)</Label>
            <Textarea
              id="customSoftSkills"
              value={assessmentConfig.customSoftSkills}
              onChange={(e) => setAssessmentConfig(prev => ({ ...prev, customSoftSkills: e.target.value }))}
              placeholder="Leadership specific to your industry&#10;Cultural competency&#10;Specific soft skills for your role"
              rows={3}
            />
          </div>

          {/* Technical Areas */}
          <div className="bg-white p-4 rounded-lg border">
            <Label className="text-sm font-medium mb-3 block text-green-700">⚙️ Technical Areas</Label>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Object.entries(TECHNICAL_AREAS).map(([category, skills]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center space-x-2 p-2 bg-green-50 rounded">
                    <Checkbox
                      id={`tech-${category}`}
                      checked={assessmentConfig.selectedTechnicalAreas.includes(category)}
                      onCheckedChange={() => toggleTechnicalArea(category)}
                    />
                    <Label htmlFor={`tech-${category}`} className="text-sm cursor-pointer font-medium">
                      {category}
                    </Label>
                  </div>
                  
                  {/* Sub-skills selection - only show if area is selected */}
                  {assessmentConfig.selectedTechnicalAreas.includes(category) && (
                    <div className="ml-6 space-y-1 border-l-2 border-green-200 pl-3">
                      <div className="text-xs text-green-600 mb-1">Select specific skills:</div>
                      <div className="grid grid-cols-2 gap-1">
                        {skills.map((skill) => (
                          <div key={skill} className="flex items-center space-x-1">
                            <Checkbox
                              id={`tech-sub-${category}-${skill}`}
                              checked={assessmentConfig.selectedTechnicalSubSkills[category]?.includes(skill) || false}
                              onCheckedChange={() => toggleTechnicalSubSkill(category, skill)}
                              className="h-3 w-3"
                            />
                            <Label 
                              htmlFor={`tech-sub-${category}-${skill}`} 
                              className="text-xs cursor-pointer leading-tight"
                            >
                              {skill}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Custom Technical Skills */}
          <div className="bg-white p-4 rounded-lg border">
            <Label htmlFor="customTechnicalSkills" className="text-sm font-medium mb-2 block text-green-700">🔧 Custom Technical Skills (one per line)</Label>
            <Textarea
              id="customTechnicalSkills"
              value={assessmentConfig.customTechnicalSkills}
              onChange={(e) => setAssessmentConfig(prev => ({ ...prev, customTechnicalSkills: e.target.value }))}
              placeholder="Specific software tools&#10;Industry-specific technologies&#10;Additional technical requirements"
              rows={3}
            />
          </div>
        </div>

        {/* Preview */}
        {(assessmentConfig.selectedSoftSkillsAreas.length > 0 || assessmentConfig.selectedTechnicalAreas.length > 0 || assessmentConfig.customSoftSkills.trim() || assessmentConfig.customTechnicalSkills.trim()) && (
          <div className="bg-white p-4 rounded-lg border">
            <Label className="text-sm font-medium mb-2 block">📋 Assessment Preview</Label>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-blue-700 font-medium mb-1">Soft Skills ({assessmentConfig.selectedSoftSkillsAreas.length} areas)</div>
                <div className="text-gray-600">
                  {assessmentConfig.selectedSoftSkillsAreas.join(', ')}
                </div>
              </div>
              <div>
                <div className="text-green-700 font-medium mb-1">Technical ({assessmentConfig.selectedTechnicalAreas.length} areas)</div>
                <div className="text-gray-600">
                  {assessmentConfig.selectedTechnicalAreas.join(', ')}
                </div>
              </div>
            </div>
            {assessmentConfig.customSoftSkills.trim() && (
              <div className="mt-2">
                <div className="text-purple-700 font-medium mb-1 text-xs">Custom Soft Skills</div>
                <div className="text-gray-600 text-xs">
                  {assessmentConfig.customSoftSkills.split('\n').filter(s => s.trim()).join(', ')}
                </div>
              </div>
            )}
            {assessmentConfig.customTechnicalSkills.trim() && (
              <div className="mt-2">
                <div className="text-purple-700 font-medium mb-1 text-xs">Custom Technical Skills</div>
                <div className="text-gray-600 text-xs">
                  {assessmentConfig.customTechnicalSkills.split('\n').filter(s => s.trim()).join(', ')}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  // Main Dashboard UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-indigo-600 mr-3" />
              <div>
                <h1>Admin Panel</h1>
                <p className="text-gray-500">Manage positions and candidates</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-gray-600">Welcome, {user?.name || user?.email}</p>
                <p className="text-gray-400">Administrator</p>
              </div>
              <Button variant="outline" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="positions" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Job Positions
            </TabsTrigger>
            <TabsTrigger value="rankings" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Candidate Rankings
            </TabsTrigger>
          </TabsList>

          {/* Job Positions Tab */}
          <TabsContent value="positions" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Briefcase className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">Total Positions</h3>
                      <p className="text-2xl font-bold text-gray-900">{positions.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">Open Positions</h3>
                      <p className="text-2xl font-bold text-gray-900">{positions.filter(p => p.status === 'open').length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Users className="h-6 w-6 text-amber-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">Closed Positions</h3>
                      <p className="text-2xl font-bold text-gray-900">{positions.filter(p => p.status === 'closed').length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Positions Table */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Job Positions</CardTitle>
                    <CardDescription>Manage your job positions and their assessment configurations</CardDescription>
                  </div>
                  <Button onClick={openCreateDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Position
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {positions.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No job positions yet</h3>
                    <p className="text-gray-500 mb-4">Get started by creating your first job position</p>
                    <Button onClick={openCreateDialog}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Position
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Position</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Assessment Weights</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {positions.map((position) => (
                          <TableRow key={position.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{position.title}</div>
                                {position.salary && (
                                  <div className="text-sm text-gray-500">{position.salary}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{position.company}</TableCell>
                            <TableCell className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                              {position.location}
                            </TableCell>
                            <TableCell>
                              <Badge className={getJobTypeColor(position.type)}>
                                {position.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(position.status)}>
                                {position.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs">
                                <div>Soft: {position.assessmentWeights?.softSkills || 50}%</div>
                                <div>Tech: {position.assessmentWeights?.technical || 50}%</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{formatDate(position.createdAt)}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => fetchRankedCandidates(position.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(position)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteJobPosition(position.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Candidate Rankings Tab */}
          <TabsContent value="rankings" className="space-y-6">
            {selectedPosition ? (
              <>
                {/* Position Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Candidate Rankings: {selectedPosition.title}
                    </CardTitle>
                    <CardDescription>
                      {selectedPosition.company} • {selectedPosition.location}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Assessment Weights</h4>
                        <div className="mt-2">
                          <div className="flex justify-between text-sm">
                            <span>Soft Skills</span>
                            <span className="font-medium">{selectedPosition.assessmentWeights?.softSkills || 50}%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Technical</span>
                            <span className="font-medium">{selectedPosition.assessmentWeights?.technical || 50}%</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Required Skills</h4>
                        <div className="mt-2 text-sm text-gray-600">
                          <div>Soft: {selectedPosition.requiredSkills?.softSkills?.length || 0} areas</div>
                          <div>Technical: {selectedPosition.requiredSkills?.technical?.length || 0} areas</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Candidates Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Ranked Candidates ({rankedCandidates.length})</CardTitle>
                    <CardDescription>Candidates ranked by weighted assessment scores</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {rankedCandidates.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No candidates yet</h3>
                        <p className="text-gray-500">No candidates have applied for this position</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Rank</TableHead>
                              <TableHead>Candidate</TableHead>
                              <TableHead>Contact</TableHead>
                              <TableHead>Soft Skills</TableHead>
                              <TableHead>Technical</TableHead>
                              <TableHead>Weighted Score</TableHead>
                              <TableHead>Resume Score</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rankedCandidates.map((candidate, index) => (
                              <TableRow key={candidate.userId}>
                                <TableCell>
                                  <div className="flex items-center">
                                    <Badge variant="outline">#{index + 1}</Badge>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{candidate.profile?.name}</div>
                                    <div className="text-sm text-gray-500">{candidate.profile?.location}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <div className="flex items-center mb-1">
                                      <Mail className="h-3 w-3 mr-1" />
                                      {candidate.profile?.email}
                                    </div>
                                    {candidate.profile?.phone && (
                                      <div className="flex items-center">
                                        <Phone className="h-3 w-3 mr-1" />
                                        {candidate.profile?.phone}
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {candidate.scores?.softSkills || 0}%
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {candidate.scores?.technical || 0}%
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-blue-100 text-blue-800">
                                    {candidate.scores?.weighted?.toFixed(1) || 0}%
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {candidate.scores?.bertScore ? (
                                    <Badge className={getResumeScoreColor(candidate.scores.bertScore)}>
                                      {candidate.scores.bertScore.toFixed(1)}%
                                    </Badge>
                                  ) : (
                                    <span className="text-sm text-gray-400">N/A</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openCandidateDialog(candidate)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => downloadResume(candidate)}
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Position</h3>
                  <p className="text-gray-500 mb-4">Choose a job position from the Positions tab to view candidate rankings</p>
                  <Button onClick={() => setActiveTab('positions')}>
                    View Positions
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Position Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Job Position</DialogTitle>
            <DialogDescription>
              Add a new job position with assessment configuration
            </DialogDescription>
          </DialogHeader>
          
          {renderPositionForm()}
          
          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveJobPosition} disabled={saving}>
              {saving ? 'Creating...' : 'Create Position'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Position Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Job Position</DialogTitle>
            <DialogDescription>
              Update job position details and assessment configuration
            </DialogDescription>
          </DialogHeader>
          
          {renderPositionForm()}
          
          <div className="flex justify-end gap-4 pt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveJobPosition} disabled={saving}>
              {saving ? 'Updating...' : 'Update Position'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Candidate Detail Dialog */}
      <Dialog open={isCandidateDialogOpen} onOpenChange={setIsCandidateDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Candidate Details</DialogTitle>
            <DialogDescription>
              Detailed information about the candidate
            </DialogDescription>
          </DialogHeader>
          
          {selectedCandidate && (
            <div className="space-y-6">
              {/* Profile Information */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Profile Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>Name:</strong> {selectedCandidate.profile?.name}</div>
                    <div><strong>Email:</strong> {selectedCandidate.profile?.email}</div>
                    <div><strong>Phone:</strong> {selectedCandidate.profile?.phone || 'N/A'}</div>
                    <div><strong>Location:</strong> {selectedCandidate.profile?.location}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Assessment Scores</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Soft Skills:</span>
                      <Badge variant="outline">{selectedCandidate.scores?.softSkills || 0}%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Technical:</span>
                      <Badge variant="outline">{selectedCandidate.scores?.technical || 0}%</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Weighted Score:</span>
                      <Badge className="bg-blue-100 text-blue-800">{selectedCandidate.scores?.weighted?.toFixed(1) || 0}%</Badge>
                    </div>
                    {selectedCandidate.scores?.bertScore && (
                      <div className="flex justify-between">
                        <span>Resume Score:</span>
                        <Badge className={getResumeScoreColor(selectedCandidate.scores.bertScore)}>
                          {selectedCandidate.scores.bertScore.toFixed(1)}%
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio and Experience */}
              {selectedCandidate.profile?.bio && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Bio</h4>
                  <p className="text-sm text-gray-600">{selectedCandidate.profile.bio}</p>
                </div>
              )}

              {selectedCandidate.profile?.experience && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Experience</h4>
                  <p className="text-sm text-gray-600">{selectedCandidate.profile.experience}</p>
                </div>
              )}

              {selectedCandidate.profile?.skills && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Skills</h4>
                  <p className="text-sm text-gray-600">{selectedCandidate.profile.skills}</p>
                </div>
              )}

              {selectedCandidate.profile?.education && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Education</h4>
                  <p className="text-sm text-gray-600">{selectedCandidate.profile.education}</p>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end gap-4 pt-4">
            {selectedCandidate?.profile?.resumeUrl && (
              <Button variant="outline" onClick={() => downloadResume(selectedCandidate)}>
                <Download className="h-4 w-4 mr-2" />
                Download Resume
              </Button>
            )}
            <Button onClick={() => setIsCandidateDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}