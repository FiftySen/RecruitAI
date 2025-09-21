import { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Upload, 
  FileText, 
  Download,
  Save,
  CheckCircle,
  AlertCircle,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ProfileProps {
  onBack: () => void;
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
  resumeFileName?: string;
}

export function Profile({ onBack }: ProfileProps) {
  const { user, changePassword } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    location: '',
    bio: '',
    experience: '',
    skills: '',
    education: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    newPassword: false,
    confirmPassword: false
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/get-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ userId: user?.id })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setProfile(prevProfile => ({
            ...prevProfile,
            ...data.profile
          }));
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/save-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          userId: user?.id,
          profile: profile
        })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile saved successfully!' });
      } else {
        throw new Error('Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: 'Failed to save profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Please upload a PDF or Word document.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setMessage({ type: 'error', text: 'File size must be less than 5MB.' });
      return;
    }

    setUploadingResume(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('userId', user?.id || '');

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/upload-resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(prev => ({
          ...prev,
          resumeUrl: data.resumeUrl,
          resumeFileName: file.name
        }));
        setMessage({ type: 'success', text: 'Resume uploaded successfully!' });
      } else {
        throw new Error('Failed to upload resume');
      }
    } catch (error) {
      console.error('Error uploading resume:', error);
      setMessage({ type: 'error', text: 'Failed to upload resume. Please try again.' });
    } finally {
      setUploadingResume(false);
    }
  };

  const downloadResume = () => {
    if (profile.resumeUrl) {
      window.open(profile.resumeUrl, '_blank');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setChangingPassword(true);
    setMessage(null);

    try {
      await changePassword(passwordForm.newPassword);
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
    } catch (error: any) {
      console.error('Error changing password:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to change password. Please try again.' });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={onBack} className="mr-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
          <p className="text-gray-600">Manage your personal information and resume</p>
        </div>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 mr-2" />
          ) : (
            <AlertCircle className="w-5 h-5 mr-2" />
          )}
          {message.text}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter your email"
                    disabled
                  />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={profile.location}
                    onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="City, Country"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Brief description about yourself, your career goals, and interests..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Professional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="experience">Work Experience</Label>
                <Textarea
                  id="experience"
                  value={profile.experience}
                  onChange={(e) => setProfile(prev => ({ ...prev, experience: e.target.value }))}
                  placeholder="Describe your work experience, key roles, and achievements..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="skills">Skills & Technologies</Label>
                <Textarea
                  id="skills"
                  value={profile.skills}
                  onChange={(e) => setProfile(prev => ({ ...prev, skills: e.target.value }))}
                  placeholder="List your technical skills, programming languages, tools, frameworks..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="education">Education</Label>
                <Textarea
                  id="education"
                  value={profile.education}
                  onChange={(e) => setProfile(prev => ({ ...prev, education: e.target.value }))}
                  placeholder="Educational background, degrees, certifications..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Resume Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Resume
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.resumeUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600 mr-2" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-green-800 truncate">
                        {profile.resumeFileName || 'resume.pdf'}
                      </p>
                      <p className="text-sm text-green-600">Upload complete</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadResume}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    
                    <Label htmlFor="resume-upload" className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={uploadingResume}
                        asChild
                      >
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Replace
                        </span>
                      </Button>
                    </Label>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No resume uploaded yet</p>
                  
                  <Label htmlFor="resume-upload">
                    <Button disabled={uploadingResume} asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingResume ? 'Uploading...' : 'Upload Resume'}
                      </span>
                    </Button>
                  </Label>
                </div>
              )}

              <input
                id="resume-upload"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleResumeUpload}
                className="hidden"
              />

              <div className="text-xs text-gray-500 space-y-1">
                <p>• Supported formats: PDF, DOC, DOCX</p>
                <p>• Maximum file size: 5MB</p>
              </div>
            </CardContent>
          </Card>

          {/* Profile Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center">
                    <Mail className="w-4 h-4 mr-2" />
                    Contact Info
                  </span>
                  <Badge variant={profile.phone && profile.location ? "default" : "secondary"}>
                    {profile.phone && profile.location ? 'Complete' : 'Incomplete'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Bio & Details  
                  </span>
                  <Badge variant={profile.bio && profile.experience ? "default" : "secondary"}>
                    {profile.bio && profile.experience ? 'Complete' : 'Incomplete'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    Resume
                  </span>
                  <Badge variant={profile.resumeUrl ? "default" : "secondary"}>
                    {profile.resumeUrl ? 'Uploaded' : 'Not uploaded'}
                  </Badge>
                </div>
              </div>

              <Separator className="my-4" />
              
              <Button 
                onClick={saveProfile} 
                disabled={saving}
                className="w-full"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password (min 6 characters)"
                  disabled={changingPassword}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  disabled={changingPassword}
                />
              </div>

              <Button 
                onClick={handlePasswordChange} 
                disabled={changingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                className="w-full"
              >
                <Lock className="w-4 h-4 mr-2" />
                {changingPassword ? 'Changing...' : 'Change Password'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}