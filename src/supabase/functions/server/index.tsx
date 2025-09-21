import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { cors } from "npm:hono/cors";
import { Hono } from "npm:hono";
import { logger } from "npm:hono/logger";
import * as kv from './kv_store.tsx';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));
app.use('*', logger(console.log));

// Initialize Supabase clients
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create buckets for file storage
const initializeBuckets = async () => {
  const bucketName = 'make-6ead2a10-resumes';
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      const { error } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: false,
        allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (error) {
        console.error('Error creating bucket:', error);
      } else {
        console.log('Resume bucket created successfully');
      }
    }
  } catch (error) {
    console.error('Error initializing buckets:', error);
  }
};

// Helper function to get all keys by prefix with full key-value pairs
const getByPrefixWithKeys = async (prefix: string) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const { data, error } = await supabaseClient
    .from('kv_store_6ead2a10')
    .select('key, value')
    .like('key', prefix + '%');
    
  if (error) {
    throw new Error(error.message);
  }
  
  return data || [];
};

// Create sample job positions with required skills
const initializeSampleJobs = async () => {
  try {
    // Check if sample jobs already exist
    const existingJobs = await getByPrefixWithKeys('job-position:');
    if (existingJobs.length > 0) {
      console.log('Sample jobs already exist, skipping initialization');
      return;
    }

    const sampleJobs = [
      {
        id: 'pos_frontend_001',
        title: 'Senior Frontend Developer',
        company: 'TechCorp Inc.',
        location: 'San Francisco, CA',
        type: 'full-time',
        salary: '$120,000 - $150,000',
        description: 'We are seeking a Senior Frontend Developer to join our dynamic team. You will be responsible for building scalable web applications using modern JavaScript frameworks and collaborating with our design and backend teams to deliver exceptional user experiences.',
        requirements: [
          '5+ years of experience with React or Vue.js',
          'Strong proficiency in JavaScript, HTML5, and CSS3',
          'Experience with state management (Redux, Vuex, etc.)',
          'Familiarity with modern build tools (Webpack, Vite)',
          'Experience with responsive design and cross-browser compatibility',
          'Knowledge of RESTful APIs and GraphQL',
          'Bachelor\'s degree in Computer Science or equivalent experience'
        ],
        responsibilities: [
          'Develop and maintain high-quality frontend applications',
          'Collaborate with UX/UI designers to implement pixel-perfect designs',
          'Write clean, maintainable, and testable code',
          'Participate in code reviews and mentor junior developers',
          'Optimize applications for maximum speed and scalability',
          'Stay up-to-date with latest frontend technologies and best practices'
        ],
        benefits: [
          'Competitive salary and equity package',
          'Health, dental, and vision insurance',
          'Flexible working hours and remote work options',
          '401(k) with company matching',
          'Professional development budget',
          'Unlimited PTO policy'
        ],
        assessmentWeights: {
          softSkills: 30,
          technical: 70
        },
        requiredSkills: {
          technical: ['React', 'JavaScript', 'HTML/CSS', 'TypeScript', 'Redux', 'Webpack'],
          software: ['VS Code', 'Git', 'npm/yarn', 'Chrome DevTools', 'Figma', 'Jira']
        },
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'pos_fullstack_001',
        title: 'Full Stack Engineer',
        company: 'StartupHub',
        location: 'Austin, TX',
        type: 'full-time',
        salary: '$100,000 - $130,000',
        description: 'Join our fast-growing startup as a Full Stack Engineer! You\'ll work on both frontend and backend systems, building features that directly impact our users. This is a great opportunity for someone who wants to work in a collaborative environment with significant growth potential.',
        requirements: [
          '3+ years of full-stack development experience',
          'Proficiency in React and Node.js',
          'Experience with databases (PostgreSQL, MongoDB)',
          'Knowledge of cloud platforms (AWS, GCP, or Azure)',
          'Understanding of DevOps practices and CI/CD',
          'Strong problem-solving and communication skills'
        ],
        responsibilities: [
          'Build and maintain full-stack applications',
          'Design and implement RESTful APIs',
          'Collaborate with product team to define feature requirements',
          'Ensure application security and performance',
          'Write comprehensive tests for all code',
          'Participate in agile development processes'
        ],
        benefits: [
          'Startup equity and competitive salary',
          'Health and wellness benefits',
          'Flexible work environment',
          'Learning and development opportunities',
          'Team building events and company retreats'
        ],
        assessmentWeights: {
          softSkills: 40,
          technical: 60
        },
        requiredSkills: {
          technical: ['React', 'Node.js', 'PostgreSQL', 'MongoDB', 'AWS', 'Docker'],
          software: ['VS Code', 'Git', 'Docker Desktop', 'Postman', 'AWS CLI', 'Slack']
        },
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'pos_product_001',
        title: 'Product Manager',
        company: 'InnovateLabs',
        location: 'New York, NY',
        type: 'full-time',
        salary: '$110,000 - $140,000',
        description: 'We\'re looking for a Product Manager to lead our product strategy and roadmap. You\'ll work closely with engineering, design, and business teams to deliver products that delight our customers and drive business growth.',
        requirements: [
          '4+ years of product management experience',
          'Experience with agile development methodologies',
          'Strong analytical and data-driven decision making',
          'Excellent communication and presentation skills',
          'Experience with product analytics tools',
          'Technical background or strong technical aptitude',
          'MBA or equivalent experience preferred'
        ],
        responsibilities: [
          'Define product vision, strategy, and roadmap',
          'Gather and prioritize product requirements',
          'Work closely with engineering teams to deliver features',
          'Conduct market research and competitive analysis',
          'Define and track key product metrics',
          'Communicate product updates to stakeholders'
        ],
        benefits: [
          'Competitive salary and bonus structure',
          'Comprehensive health benefits',
          'Stock options and equity participation',
          'Professional development opportunities',
          'Flexible PTO and parental leave',
          'Modern office in Manhattan'
        ],
        assessmentWeights: {
          softSkills: 60,
          technical: 40
        },
        requiredSkills: {
          technical: ['Product Analytics', 'SQL', 'A/B Testing', 'User Research', 'Agile/Scrum'],
          software: ['Jira', 'Confluence', 'Slack', 'Google Analytics', 'Mixpanel', 'Figma']
        },
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Create sample job positions
    for (const job of sampleJobs) {
      await kv.set(`job-position:${job.id}`, job);
    }

    console.log('✅ Sample job positions created successfully');
  } catch (error) {
    console.error('Error creating sample jobs:', error);
  }
};

// Initialize buckets on startup
initializeBuckets();

// Initialize sample job positions
initializeSampleJobs();

// Initialize sample admin account
const initializeSampleAdmin = async () => {
  try {
    // First check if admin profile already exists in our KV store
    const existingAdmins = await getByPrefixWithKeys('profile:');
    const hasAdminProfile = existingAdmins.some(profile => profile.value?.role === 'admin');
    
    if (hasAdminProfile) {
      console.log('Sample admin profile already exists, skipping initialization');
      return;
    }

    // Check if the admin user exists in Supabase auth
    let adminUser = null;
    try {
      // Try to get user by email (this will throw if user doesn't exist)
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (!listError && users?.users) {
        adminUser = users.users.find(user => user.email === 'admin@recruitai.com');
      }
    } catch (error) {
      console.log('Admin user does not exist in auth, will create new one');
    }

    // If admin user doesn't exist in auth, create it
    if (!adminUser) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: 'admin@recruitai.com',
        password: 'admin123',
        user_metadata: { name: 'Admin User' },
        email_confirm: true
      });

      if (error) {
        console.error('Error creating sample admin user:', error);
        return;
      }
      adminUser = data.user;
    }

    // Create or update the admin profile in KV store
    if (adminUser) {
      await kv.set(`profile:${adminUser.id}`, {
        name: 'Admin User',
        email: 'admin@recruitai.com',
        phone: '',
        location: '',
        bio: 'System Administrator',
        experience: '',
        skills: '',
        education: '',
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      
      console.log('✅ Sample admin profile created/updated successfully (admin@recruitai.com / admin123)');
    }
  } catch (error) {
    console.error('Error initializing sample admin:', error);
  }
};

// Initialize sample admin account
initializeSampleAdmin();

// Helper function to generate unique job position ID
const generateJobPositionId = () => {
  return `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// User signup endpoint
app.post('/make-server-6ead2a10/signup', async (c) => {
  try {
    const { email, password, name, role = 'candidate' } = await c.req.json();
    
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }

    // Only allow candidate role for public signup - admins are created internally
    if (role !== 'candidate') {
      return c.json({ error: 'Only candidate accounts can be created through public signup' }, 400);
    }

    // Create user with admin client
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: { name: name },
      email_confirm: true // Automatically confirm since email server isn't configured
    });

    if (error) {
      console.error('Signup error:', error);
      return c.json({ error: error.message }, 400);
    }

    // Store initial profile data with role
    if (data.user) {
      await kv.set(`profile:${data.user.id}`, {
        name: name,
        email: email,
        phone: '',
        location: '',
        bio: '',
        experience: '',
        skills: '',
        education: '',
        role: role,
        createdAt: new Date().toISOString()
      });
    }

    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ error: 'Internal server error during signup' }, 500);
  }
});

// Get user role endpoint
app.post('/make-server-6ead2a10/get-user-role', async (c) => {
  try {
    const { userId } = await c.req.json();
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    let profile = await kv.get(`profile:${userId}`);
    
    // If profile doesn't exist, try to get user info from Supabase auth and create a profile
    if (!profile) {
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
        
        if (error || !user) {
          console.error('User not found in auth:', error);
          return c.json({ error: 'User not found' }, 404);
        }

        // Create a default profile for this user
        profile = {
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          phone: '',
          location: '',
          bio: '',
          experience: '',
          skills: '',
          education: '',
          role: 'candidate', // Default to candidate role
          createdAt: new Date().toISOString()
        };

        // Save the profile
        await kv.set(`profile:${userId}`, profile);
        console.log(`Created profile for existing user: ${user.email}`);
      } catch (authError) {
        console.error('Error fetching user from auth:', authError);
        return c.json({ error: 'Failed to retrieve user information' }, 500);
      }
    }

    // Default to candidate if role is not set
    const role = profile.role || 'candidate';
    
    return c.json({ role });
  } catch (error) {
    console.error('Get user role error:', error);
    return c.json({ error: 'Failed to retrieve user role' }, 500);
  }
});

// Get user profile
app.post('/make-server-6ead2a10/get-profile', async (c) => {
  try {
    const { userId } = await c.req.json();
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    const profile = await kv.get(`profile:${userId}`);
    return c.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    return c.json({ error: 'Failed to retrieve profile' }, 500);
  }
});

// Save user profile
app.post('/make-server-6ead2a10/save-profile', async (c) => {
  try {
    const { userId, profile } = await c.req.json();
    
    if (!userId || !profile) {
      return c.json({ error: 'User ID and profile data are required' }, 400);
    }

    // Add timestamp
    profile.updatedAt = new Date().toISOString();
    
    await kv.set(`profile:${userId}`, profile);
    return c.json({ success: true });
  } catch (error) {
    console.error('Save profile error:', error);
    return c.json({ error: 'Failed to save profile' }, 500);
  }
});

// ===== JOB POSITION MANAGEMENT ENDPOINTS =====

// Get all job positions
app.get('/make-server-6ead2a10/get-job-positions', async (c) => {
  try {
    console.log('Fetching job positions...');
    
    // Use the helper function to get positions with keys
    const positions = await getByPrefixWithKeys('job-position:');
    console.log('Raw positions from database:', positions);
    
    const positionsData = positions.map(p => {
      if (!p.key || !p.value) {
        console.error('Invalid position data:', p);
        return null;
      }
      
      const id = p.key.split(':')[1];
      return {
        id,
        ...p.value
      };
    }).filter(Boolean); // Remove null entries
    
    console.log('Processed positions data:', positionsData);
    
    return c.json({ positions: positionsData });
  } catch (error) {
    console.error('Get job positions error:', error);
    return c.json({ error: 'Failed to retrieve job positions' }, 500);
  }
});

// Get specific job position
app.post('/make-server-6ead2a10/get-job-position', async (c) => {
  try {
    const { positionId } = await c.req.json();
    
    if (!positionId) {
      return c.json({ error: 'Position ID is required' }, 400);
    }

    const position = await kv.get(`job-position:${positionId}`);
    
    if (!position) {
      return c.json({ error: 'Job position not found' }, 404);
    }

    return c.json({ position: { id: positionId, ...position } });
  } catch (error) {
    console.error('Get job position error:', error);
    return c.json({ error: 'Failed to retrieve job position' }, 500);
  }
});

// Helper function to verify admin role
const verifyAdminRole = async (accessToken: string) => {
  if (!accessToken) {
    return { isAdmin: false, user: null, error: 'No access token provided' };
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (error || !user?.id) {
      return { isAdmin: false, user: null, error: 'Invalid access token' };
    }

    // Get user profile to check role
    let profile = await kv.get(`profile:${user.id}`);
    
    // If profile doesn't exist, create a default one
    if (!profile) {
      profile = {
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        phone: '',
        location: '',
        bio: '',
        experience: '',
        skills: '',
        education: '',
        role: 'candidate', // Default to candidate role
        createdAt: new Date().toISOString()
      };
      
      await kv.set(`profile:${user.id}`, profile);
      console.log(`Created profile for user during admin verification: ${user.email}`);
    }
    
    const role = profile.role || 'candidate';
    
    return { isAdmin: role === 'admin', user, error: null };
  } catch (error) {
    console.error('Admin verification error:', error);
    return { isAdmin: false, user: null, error: 'Failed to verify admin role' };
  }
};

// Create or update job position (Admin only)
app.post('/make-server-6ead2a10/save-job-position', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { isAdmin, user, error } = await verifyAdminRole(accessToken);
    
    if (!isAdmin) {
      return c.json({ error: error || 'Unauthorized - Admin access required' }, 401);
    }

    const { positionId, position } = await c.req.json();
    
    if (!position) {
      return c.json({ error: 'Position data is required' }, 400);
    }

    const id = positionId || generateJobPositionId();
    
    const positionData = {
      ...position,
      id,
      createdAt: position.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.id
    };

    await kv.set(`job-position:${id}`, positionData);
    
    return c.json({ success: true, position: positionData });
  } catch (error) {
    console.error('Save job position error:', error);
    return c.json({ error: 'Failed to save job position' }, 500);
  }
});

// Delete job position (Admin only)
app.post('/make-server-6ead2a10/delete-job-position', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { isAdmin, user, error } = await verifyAdminRole(accessToken);
    
    if (!isAdmin) {
      return c.json({ error: error || 'Unauthorized - Admin access required' }, 401);
    }

    const { positionId } = await c.req.json();
    
    if (!positionId) {
      return c.json({ error: 'Position ID is required' }, 400);
    }

    await kv.del(`job-position:${positionId}`);
    
    // Also delete all applications for this position
    const applications = await getByPrefixWithKeys(`job-application:${positionId}:`);
    for (const app of applications) {
      if (app.key) {
        await kv.del(app.key);
      }
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete job position error:', error);
    return c.json({ error: 'Failed to delete job position' }, 500);
  }
});

// ===== RESUME AND APPLICATION ENDPOINTS =====

// Upload resume endpoint
app.post('/make-server-6ead2a10/upload-resume', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('resume') as File;
    const userId = formData.get('userId') as string;
    
    if (!file || !userId) {
      return c.json({ error: 'Resume file and user ID are required' }, 400);
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Only PDF and Word documents are allowed' }, 400);
    }

    // Validate file size (5MB limit)
    if (file.size > 5242880) {
      return c.json({ error: 'File size must be less than 5MB' }, 400);
    }

    // Create unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `resume_${Date.now()}.${fileExtension}`;
    const filePath = `${userId}/${fileName}`;

    // Convert file to buffer
    const fileBuffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('make-6ead2a10-resumes')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return c.json({ error: 'Failed to upload resume' }, 500);
    }

    // Extract text from resume for BERT analysis
    const resumeText = await extractTextFromFile(file);
    
    // Calculate BERT score (mock implementation)
    const bertScore = await calculateBERTScore(resumeText);

    // Update user profile with resume info
    const profile = await kv.get(`profile:${userId}`) || {};
    profile.resumeUrl = `${userId}/${fileName}`;
    profile.resumeFileName = file.name;
    profile.resumeUploadedAt = new Date().toISOString();
    profile.bertScore = bertScore; // Store BERT score in profile
    
    await kv.set(`profile:${userId}`, profile);

    return c.json({ 
      success: true, 
      resumeUrl: `${userId}/${fileName}`,
      bertScore: bertScore // Return for admin use only
    });
  } catch (error) {
    console.error('Upload resume error:', error);
    return c.json({ error: 'Failed to upload resume' }, 500);
  }
});

// Helper function to extract text from resume (simplified)
const extractTextFromFile = async (file: File): Promise<string> => {
  // This is a simplified text extraction
  // In production, you'd use proper PDF/Word parsing libraries
  try {
    if (file.type === 'application/pdf') {
      // For PDF, we'd use a PDF parsing library
      return "Sample extracted text from PDF resume";
    } else {
      // For Word docs, we'd use appropriate parsing
      return "Sample extracted text from Word resume";
    }
  } catch (error) {
    console.error('Text extraction error:', error);
    return "Unable to extract text from resume";
  }
};

// Mock BERT scoring function
const calculateBERTScore = async (resumeText: string): Promise<number> => {
  // This is a mock implementation
  // In production, you'd integrate with actual BERT model
  const keywords = ['experience', 'skills', 'education', 'project', 'development', 'management'];
  const wordCount = resumeText.toLowerCase().split(' ').length;
  const keywordMatches = keywords.filter(keyword => 
    resumeText.toLowerCase().includes(keyword)
  ).length;
  
  // Simple scoring algorithm (0-100)
  const baseScore = Math.min(wordCount / 10, 50); // Length factor
  const keywordScore = (keywordMatches / keywords.length) * 50; // Keyword relevance
  
  return Math.round(baseScore + keywordScore);
};

// Apply for a job position with resume
app.post('/make-server-6ead2a10/apply-for-job', async (c) => {
  try {
    const { userId, positionId, resumeUrl } = await c.req.json();
    
    if (!userId || !positionId) {
      return c.json({ error: 'User ID and Position ID are required' }, 400);
    }

    // Check if position exists
    const position = await kv.get(`job-position:${positionId}`);
    if (!position) {
      return c.json({ error: 'Job position not found' }, 404);
    }

    // Check if user already applied
    const existingApplication = await kv.get(`job-application:${positionId}:${userId}`);
    if (existingApplication) {
      return c.json({ error: 'You have already applied for this position' }, 400);
    }

    // Get user profile for BERT score
    const profile = await kv.get(`profile:${userId}`) || {};

    const applicationData = {
      userId,
      positionId,
      appliedAt: new Date().toISOString(),
      status: 'pending',
      resumeUrl: resumeUrl || profile.resumeUrl,
      bertScore: profile.bertScore || 0 // Include BERT score in application
    };

    await kv.set(`job-application:${positionId}:${userId}`, applicationData);
    
    return c.json({ success: true, application: applicationData });
  } catch (error) {
    console.error('Apply for job error:', error);
    return c.json({ error: 'Failed to apply for job' }, 500);
  }
});

// Get user's job applications
app.post('/make-server-6ead2a10/get-user-applications', async (c) => {
  try {
    const { userId } = await c.req.json();
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    const allApplications = await getByPrefixWithKeys('job-application:');
    const userApplications = allApplications.filter(app => 
      app.value && app.value.userId === userId
    );

    const applicationsWithPositions = [];
    for (const app of userApplications) {
      if (app.value) {
        const position = await kv.get(`job-position:${app.value.positionId}`);
        
        // Get assessment results
        const softSkillsResult = await kv.get(`latest-assessment:${userId}:soft-skills`);
        const technicalResult = await kv.get(`latest-assessment:${userId}:technical`);
        
        // Calculate assessment status
        const assessmentStatus = {
          softSkills: softSkillsResult ? 'completed' : 'not_started',
          technical: technicalResult ? 'completed' : 'not_started'
        };
        
        // Calculate scores if available
        let scores = null;
        if (softSkillsResult || technicalResult) {
          const softSkillsScore = softSkillsResult?.totalScore || 0;
          const technicalScore = technicalResult?.totalScore || 0;
          
          const positionWeights = position?.assessmentWeights || { softSkills: 50, technical: 50 };
          const softSkillsWeight = positionWeights.softSkills / 100;
          const technicalWeight = positionWeights.technical / 100;
          
          const weightedScore = (softSkillsScore * softSkillsWeight) + (technicalScore * technicalWeight);
          
          scores = {
            softSkills: softSkillsScore,
            technical: technicalScore,
            weighted: Math.round(weightedScore * 100) / 100
          };
        }

        applicationsWithPositions.push({
          ...app.value,
          position: position ? { id: app.value.positionId, ...position } : null,
          assessmentStatus,
          scores
        });
      }
    }
    
    return c.json({ applications: applicationsWithPositions });
  } catch (error) {
    console.error('Get user applications error:', error);
    return c.json({ error: 'Failed to retrieve applications' }, 500);
  }
});

// ===== CANDIDATE RANKING ENDPOINTS =====

// Get ranked candidates for a job position (Admin only)
app.post('/make-server-6ead2a10/get-ranked-candidates', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { isAdmin, user, error } = await verifyAdminRole(accessToken);
    
    if (!isAdmin) {
      return c.json({ error: error || 'Unauthorized - Admin access required' }, 401);
    }

    const { positionId } = await c.req.json();
    
    if (!positionId) {
      return c.json({ error: 'Position ID is required' }, 400);
    }

    // Get job position with weights
    const position = await kv.get(`job-position:${positionId}`);
    if (!position) {
      return c.json({ error: 'Job position not found' }, 404);
    }

    // Get all applications for this position
    const applications = await getByPrefixWithKeys(`job-application:${positionId}:`);
    
    const candidates = [];
    for (const app of applications) {
      if (app.value && app.value.userId) {
        const userId = app.value.userId;
        
        // Get candidate profile
        const profile = await kv.get(`profile:${userId}`);
        
        // Get assessment results
        const softSkillsResult = await kv.get(`latest-assessment:${userId}:soft-skills`);
        const technicalResult = await kv.get(`latest-assessment:${userId}:technical`);
        
        // Calculate weighted score
        const softSkillsScore = softSkillsResult?.totalScore || 0;
        const technicalScore = technicalResult?.totalScore || 0;
        
        const softSkillsWeight = (position.assessmentWeights?.softSkills || 50) / 100;
        const technicalWeight = (position.assessmentWeights?.technical || 50) / 100;
        
        const weightedScore = (softSkillsScore * softSkillsWeight) + (technicalScore * technicalWeight);
        
        candidates.push({
          userId,
          profile,
          assessments: {
            softSkills: softSkillsResult,
            technical: technicalResult
          },
          application: app.value,
          scores: {
            softSkills: softSkillsScore,
            technical: technicalScore,
            weighted: Math.round(weightedScore * 100) / 100,
            bertScore: app.value.bertScore || 0 // Include BERT score
          }
        });
      }
    }
    
    // Sort candidates by weighted score (descending)
    candidates.sort((a, b) => b.scores.weighted - a.scores.weighted);
    
    return c.json({ 
      position: { id: positionId, ...position },
      candidates,
      totalCandidates: candidates.length 
    });
  } catch (error) {
    console.error('Get ranked candidates error:', error);
    return c.json({ error: 'Failed to retrieve ranked candidates' }, 500);
  }
});

// Get resume URL for admin
app.post('/make-server-6ead2a10/get-resume-url', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { isAdmin, user, error } = await verifyAdminRole(accessToken);
    
    if (!isAdmin) {
      return c.json({ error: error || 'Unauthorized - Admin access required' }, 401);
    }

    const { userId } = await c.req.json();
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    // Get user profile to check for resume
    const profile = await kv.get(`profile:${userId}`);
    if (!profile?.resumeUrl) {
      return c.json({ error: 'No resume found for this user' }, 404);
    }

    // Extract file path from the stored URL
    const resumePath = profile.resumeUrl.split('/').pop();
    const filePath = `${userId}/${resumePath}`;

    // Generate fresh signed URL
    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from('make-6ead2a10-resumes')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (urlError) {
      console.error('Error generating signed URL:', urlError);
      return c.json({ error: 'Failed to generate resume URL' }, 500);
    }

    return c.json({ resumeUrl: signedUrlData.signedUrl });
  } catch (error) {
    console.error('Get resume URL error:', error);
    return c.json({ error: 'Failed to get resume URL' }, 500);
  }
});

// Generate soft skill question
app.post('/make-server-6ead2a10/generate-soft-skill-question', async (c) => {
  try {
    const { topic, questionNumber, userId } = await c.req.json();
    
    // Sample questions for each soft skill topic
    const softSkillQuestions: Record<string, string[]> = {
      'Communication': [
        "Describe a time when you had to explain a complex technical concept to a non-technical stakeholder. How did you ensure they understood, and what was the outcome?",
        "Tell me about a situation where you had to deliver difficult news to a team or client. How did you approach it?"
      ],
      'Teamwork': [
        "Can you share an example of when you had to work with a difficult team member? How did you handle the situation?",
        "Describe a project where team collaboration was crucial to success. What role did you play?"
      ],
      'Leadership': [
        "Tell me about a time when you had to step up and lead without formal authority. What challenges did you face?",
        "Describe a situation where you had to motivate a team during a challenging period."
      ],
      'Problem Solving': [
        "Walk me through your approach to a complex problem you solved recently. What was your thought process?",
        "Describe a time when your first solution to a problem didn't work. How did you adapt?"
      ],
      'Adaptability': [
        "Tell me about a time when you had to quickly adapt to a major change at work. How did you handle it?",
        "Describe a situation where you had to learn a new skill or technology quickly to meet a deadline."
      ],
      'Time Management': [
        "How do you prioritize tasks when everything seems urgent? Can you give me a specific example?",
        "Describe a time when you had to manage multiple competing deadlines. What was your strategy?"
      ],
      'Conflict Resolution': [
        "Tell me about a time when you helped resolve a conflict between team members. What approach did you take?",
        "Describe a situation where you disagreed with a colleague or manager. How did you handle it?"
      ],
      'Emotional Intelligence': [
        "Can you share an example of when you had to manage your emotions in a stressful work situation?",
        "Describe a time when you recognized that a colleague was struggling and how you responded."
      ]
    };

    const questions = softSkillQuestions[topic] || [
      `Tell me about your experience with ${topic.toLowerCase()}. Can you provide a specific example?`
    ];
    
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    
    return c.json({ 
      question: `**${topic} (Question ${questionNumber}/8)**\n\n${randomQuestion}`,
      topic: topic
    });
  } catch (error) {
    console.error('Generate soft skill question error:', error);
    return c.json({ error: 'Failed to generate question' }, 500);
  }
});

// Generate technical question based on job requirements
app.post('/make-server-6ead2a10/generate-technical-question', async (c) => {
  try {
    const { area, questionNumber, userId, positionId } = await c.req.json();
    
    // Get job position to understand required skills
    let jobRequiredSkills = [];
    if (positionId) {
      const position = await kv.get(`job-position:${positionId}`);
      if (position?.requiredSkills?.technical) {
        jobRequiredSkills = position.requiredSkills.technical;
      }
    }
    
    // Sample technical questions for each area
    const technicalQuestions: Record<string, { question: string; expectsCode?: boolean }[]> = {
      'Programming Fundamentals': [
        { question: "Explain the difference between object-oriented and functional programming paradigms. When would you use each approach?" },
        { question: "What are the principles of SOLID in software development? Can you provide examples of how you've applied them?" }
      ],
      'Data Structures & Algorithms': [
        { question: "Compare the time complexity of searching in an array vs. a binary search tree. When would you choose each?", expectsCode: true },
        { question: "Implement a function to reverse a linked list. Explain your approach and analyze the time/space complexity.", expectsCode: true }
      ],
      'System Design': [
        { question: "How would you design a URL shortening service like bit.ly? Consider scalability, reliability, and performance." },
        { question: "Explain how you would architect a real-time chat application. What technologies and patterns would you use?" }
      ],
      'Database Knowledge': [
        { question: "Explain the difference between SQL and NoSQL databases. When would you choose each for a project?" },
        { question: "How would you optimize a slow-performing database query? Walk me through your debugging process." }
      ],
      'Web Development': [
        { question: "Explain the difference between server-side and client-side rendering. What are the trade-offs of each?" },
        { question: "How do you handle state management in a large React application? Compare different approaches." }
      ],
      'Problem Solving': [
        { question: "Describe your process for debugging a complex technical issue. What tools and techniques do you use?" },
        { question: "Tell me about a time when you had to optimize code for performance. What was your approach?" }
      ]
    };

    let questions = technicalQuestions[area] || [
      { question: `Tell me about your experience with ${area.toLowerCase()}. Can you provide a specific example?` }
    ];
    
    // If we have job-specific skills, create tailored questions
    if (jobRequiredSkills.length > 0 && (area === 'Web Development' || area === 'Programming Fundamentals')) {
      const relevantSkills = jobRequiredSkills.slice(0, 3); // Focus on top 3 skills
      const skillBasedQuestions = relevantSkills.map(skill => ({
        question: `This position requires expertise in ${skill}. Can you describe a challenging project where you used ${skill} and how you overcame any obstacles?`,
        expectsCode: ['React', 'JavaScript', 'Node.js', 'Python', 'Java'].includes(skill)
      }));
      
      questions = [...skillBasedQuestions, ...questions];
    }
    
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    
    return c.json({ 
      question: `**${area} (Question ${questionNumber}/8)**\n\n${randomQuestion.question}${jobRequiredSkills.length > 0 ? '\n\n*This question is tailored to the specific requirements of the position you applied for.*' : ''}`,
      area: area,
      expectsCode: randomQuestion.expectsCode || false,
      jobSpecific: jobRequiredSkills.length > 0
    });
  } catch (error) {
    console.error('Generate technical question error:', error);
    return c.json({ error: 'Failed to generate question' }, 500);
  }
});

// Save assessment response and calculate scores
app.post('/make-server-6ead2a10/save-assessment', async (c) => {
  try {
    const { userId, assessmentType, responses, totalScore } = await c.req.json();
    
    if (!userId || !assessmentType || !responses) {
      return c.json({ error: 'User ID, assessment type, and responses are required' }, 400);
    }

    const assessmentData = {
      userId,
      type: assessmentType,
      responses,
      totalScore: totalScore || 0,
      completedAt: new Date().toISOString()
    };

    // Save the latest assessment
    await kv.set(`latest-assessment:${userId}:${assessmentType}`, assessmentData);
    
    // Also save with timestamp for history
    const timestamp = Date.now();
    await kv.set(`assessment:${userId}:${assessmentType}:${timestamp}`, assessmentData);

    return c.json({ success: true, assessment: assessmentData });
  } catch (error) {
    console.error('Save assessment error:', error);
    return c.json({ error: 'Failed to save assessment' }, 500);
  }
});

// Get user's assessment results
app.post('/make-server-6ead2a10/get-assessment-results', async (c) => {
  try {
    const { userId } = await c.req.json();
    
    if (!userId) {
      return c.json({ error: 'User ID is required' }, 400);
    }

    const softSkillsResult = await kv.get(`latest-assessment:${userId}:soft-skills`);
    const technicalResult = await kv.get(`latest-assessment:${userId}:technical`);

    return c.json({ 
      softSkills: softSkillsResult,
      technical: technicalResult
    });
  } catch (error) {
    console.error('Get assessment results error:', error);
    return c.json({ error: 'Failed to retrieve assessment results' }, 500);
  }
});

// Update application status (Admin only)
app.post('/make-server-6ead2a10/update-application-status', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { isAdmin, user, error } = await verifyAdminRole(accessToken);
    
    if (!isAdmin) {
      return c.json({ error: error || 'Unauthorized - Admin access required' }, 401);
    }

    const { userId, positionId, status } = await c.req.json();
    
    if (!userId || !positionId || !status) {
      return c.json({ error: 'User ID, position ID, and status are required' }, 400);
    }

    // Get existing application
    const application = await kv.get(`job-application:${positionId}:${userId}`);
    if (!application) {
      return c.json({ error: 'Application not found' }, 404);
    }

    // Update status
    application.status = status;
    application.updatedAt = new Date().toISOString();
    application.updatedBy = user.id;

    await kv.set(`job-application:${positionId}:${userId}`, application);
    
    return c.json({ success: true, application });
  } catch (error) {
    console.error('Update application status error:', error);
    return c.json({ error: 'Failed to update application status' }, 500);
  }
});

Deno.serve(app.fetch);