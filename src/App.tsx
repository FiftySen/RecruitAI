import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from './utils/supabase/client';
import { projectId, publicAnonKey } from './utils/supabase/info';
import { AuthPage } from './components/AuthPage';
import { CandidateDashboard } from './components/CandidateDashboard';
import { EnhancedAdminPanel } from './components/EnhancedAdminPanel';
import { SoftSkillsAssessment } from './components/SoftSkillsAssessment';
import { TechnicalAssessment } from './components/TechnicalAssessment';
import { Profile } from './components/Profile';
import { AssessmentResults } from './components/AssessmentResults';
import { JobDetail } from './components/JobDetail';
import { ApplicationDetail } from './components/ApplicationDetail';
import { Toaster } from './components/ui/sonner';
import { Provider } from '@supabase/supabase-js';
import { ResetPassword } from './components/ResetPassword';

interface User {
  id: string;
  email: string;
  name?: string;
  isAdmin?: boolean;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role?: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  signInWithOAuth: (provider: Provider) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const fetchUserRole = async (userId: string): Promise<string> => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/get-user-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        console.error('Failed to fetch user role:', response.status);
        return 'candidate';
      }

      const data = await response.json();
      return data.role || 'candidate';
    } catch (error) {
      console.error('Error fetching user role:', error);
      return 'candidate';
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session?.access_token && session.user) {
          const role = await fetchUserRole(session.user.id);
          const isAdmin = role === 'admin';
          
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name,
            isAdmin,
            role
          });
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
        }
        if (event === 'SIGNED_IN' && session?.user) {
          const role = await fetchUserRole(session.user.id);
          const isAdmin = role === 'admin';
          
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name,
            isAdmin,
            role
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data: { session }, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (session?.user) {
        const role = await fetchUserRole(session.user.id);
        const isAdmin = role === 'admin';
        
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name,
          isAdmin,
          role
        });
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signInWithOAuth = async (provider: Provider) => {
    try {
      await supabase.auth.signInWithOAuth({ provider });
    } catch (error) {
      console.error('OAuth sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string, role: string = 'candidate') => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email, password, name, role })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sign up failed');
      }

      await signIn(email, password);
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const changePassword = async (newPassword: string) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      const { user } = data;
      if (user) {
        const role = await fetchUserRole(user.id);
        const isAdmin = role === 'admin';
        
        setUser({
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name,
          isAdmin,
          role
        });
      }
      setIsPasswordRecovery(false);
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, changePassword, signInWithOAuth, sendPasswordResetEmail, loading }}>
      {isPasswordRecovery ? <ResetPassword /> : children}
    </AuthContext.Provider>
  );
}

type Page = 'dashboard' | 'soft-skills' | 'technical' | 'profile' | 'results' | 'admin' | 'job-detail' | 'application-detail' | 'job-detail-from-application';

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>();
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | undefined>();
  const [previousPage, setPreviousPage] = useState<Page | undefined>();

  const handleNavigate = (page: Page, jobId?: string, applicationId?: string) => {
    setPreviousPage(currentPage);
    setCurrentPage(page);
    if (jobId) setSelectedJobId(jobId);
    if (applicationId) setSelectedApplicationId(applicationId);
  };

  const handleBack = () => {
    if (currentPage === 'job-detail-from-application' && previousPage === 'application-detail') {
      setCurrentPage('application-detail');
      setSelectedJobId(undefined);
      setPreviousPage(undefined);
    } else {
      setCurrentPage('dashboard');
      setSelectedJobId(undefined);
      setSelectedApplicationId(undefined);
      setPreviousPage(undefined);
    }
  };

  const handleApply = () => {
    setCurrentPage('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  switch (currentPage) {
    case 'dashboard':
      if (user.isAdmin) {
        return <EnhancedAdminPanel onBack={handleBack} />;
      } else {
        return <CandidateDashboard onNavigate={handleNavigate} />;
      }
    
    case 'soft-skills':
      return <SoftSkillsAssessment onBack={handleBack} />;
    
    case 'technical':
      return <TechnicalAssessment onBack={handleBack} />;
    
    case 'profile':
      return <Profile onBack={handleBack} />;
    
    case 'results':
      return <AssessmentResults onBack={handleBack} />;
    
    case 'admin':
      return <EnhancedAdminPanel onBack={handleBack} />;
    
    case 'job-detail':
      return (
        <JobDetail 
          jobId={selectedJobId!} 
          onBack={handleBack}
          onApply={handleApply}
        />
      );
    
    case 'application-detail':
      return (
        <ApplicationDetail 
          applicationId={selectedApplicationId!} 
          onBack={handleBack}
          onNavigate={handleNavigate}
        />
      );
    
    case 'job-detail-from-application':
      return (
        <JobDetail 
          jobId={selectedJobId!} 
          onBack={() => {
            setCurrentPage('application-detail');
            setSelectedJobId(undefined);
            setPreviousPage(undefined);
          }}
          onApply={handleApply}
        />
      );
    
    default:
      return user.isAdmin ? 
        <EnhancedAdminPanel onBack={handleBack} /> : 
        <CandidateDashboard onNavigate={handleNavigate} />;
  }
}
