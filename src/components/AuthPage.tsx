import { useState } from 'react';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Brain, Users, Award } from 'lucide-react';

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'candidate' // Default to candidate
  });

  // Remove the unnecessary interface definition

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn(loginForm.email, loginForm.password);
    } catch (error: any) {
      setError(error.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (signupForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      await signUp(signupForm.email, signupForm.password, signupForm.name, signupForm.role);
    } catch (error: any) {
      setError(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-2 bg-blue-600 rounded-lg mr-2">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">RecruitAI</h1>
          </div>
          <p className="text-gray-600">AI-Powered Recruitment Platform</p>
        </div>

        {/* Features highlight */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <Brain className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">AI Assessments</p>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Soft Skills</p>
          </div>
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <Award className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Technical</p>
          </div>
        </div>

        {/* Auth Forms */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4 mt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="password"
                      placeholder="Password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4 mt-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Input
                      type="text"
                      placeholder="Full name"
                      value={signupForm.name}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  {/* Remove role selection - only candidates can sign up */}
                  <div>
                    <Input
                      type="password"
                      placeholder="Password (min 6 characters)"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="password"
                      placeholder="Confirm password"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {error && (
              <Alert className="mt-4" variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          Start your journey to better recruitment with AI-powered assessments
        </p>
      </div>
    </div>
  );
}