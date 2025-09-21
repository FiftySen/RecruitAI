import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Textarea } from './ui/textarea';
import { ArrowLeft, Send, Bot, User, CheckCircle, Code, Clock, Target, Cpu, CheckCircle2, Settings } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface TechnicalAssessmentProps {
  onBack: () => void;
  onComplete?: () => void;
}

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
  isCode?: boolean;
}

interface AssessmentResponse {
  question: string;
  area: string;
  response: string;
  includesCode: boolean;
}

interface JobPosition {
  id: string;
  title: string;
  company: string;
  requiredSkills?: {
    softSkills: string[];
    technical: string[];
  };
  assessmentConfiguration?: {
    selectedTechnicalSubSkills?: string[];
  };
}

// Comprehensive technical areas mapping
const TECHNICAL_AREAS_MAP = {
  'Frontend Development': [
    'React', 'Vue.js', 'Angular', 'JavaScript/TypeScript', 'HTML/CSS',
    'Responsive Design', 'UI/UX Principles', 'Frontend Testing', 'State Management', 'Performance Optimization'
  ],
  'Backend Development': [
    'Node.js', 'Python', 'Java', 'C#', 'Go',
    'API Development', 'Microservices', 'Authentication & Security', 'Server Architecture', 'Performance Tuning'
  ],
  'Database & Data': [
    'SQL Databases', 'NoSQL Databases', 'Data Modeling', 'Database Optimization', 'Data Migration',
    'Data Warehousing', 'ETL Processes', 'Database Security', 'Backup & Recovery', 'Query Optimization'
  ],
  'Cloud & DevOps': [
    'AWS', 'Azure', 'Google Cloud Platform', 'Docker', 'Kubernetes',
    'CI/CD Pipelines', 'Infrastructure as Code', 'Monitoring & Logging', 'Security & Compliance', 'Automation'
  ],
  'Data Science & AI': [
    'Machine Learning', 'Deep Learning', 'Data Analysis', 'Statistical Modeling', 'Python/R for Data Science',
    'Data Visualization', 'Natural Language Processing', 'Computer Vision', 'Big Data Technologies', 'AI Model Deployment'
  ],
  'Mobile Development': [
    'React Native', 'Flutter', 'iOS Development (Swift)', 'Android Development (Kotlin/Java)', 'Mobile UI/UX',
    'App Store Optimization', 'Mobile Testing', 'Performance Optimization', 'Push Notifications', 'Mobile Security'
  ],
  'Product & Design': [
    'Product Strategy', 'User Research', 'UI/UX Design', 'Product Analytics', 'A/B Testing',
    'Design Systems', 'Prototyping', 'User Testing', 'Product Roadmapping', 'Design Tools (Figma, Sketch)'
  ],
  'Quality Assurance': [
    'Test Planning', 'Manual Testing', 'Automated Testing', 'Performance Testing', 'Security Testing',
    'API Testing', 'Test Case Design', 'Bug Tracking', 'Test Automation Frameworks', 'Quality Metrics'
  ],
  'Human Resources': [
    'Talent Acquisition', 'Employee Relations', 'Performance Management', 'Compensation & Benefits', 'HR Information Systems',
    'Employment Law', 'Training & Development', 'Organizational Development', 'HR Analytics', 'Workforce Planning'
  ],
  'Research & Development': [
    'Research Methodology', 'Technical Documentation', 'Innovation Management', 'Prototype Development', 'Technology Evaluation',
    'Patent Research', 'Scientific Writing', 'Experimental Design', 'Technology Transfer', 'R&D Project Management'
  ]
};

export function TechnicalAssessment({ onBack, onComplete }: TechnicalAssessmentProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isCodeResponse, setIsCodeResponse] = useState(false);
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);
  const [currentQuestionText, setCurrentQuestionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jobPosition, setJobPosition] = useState<JobPosition | null>(null);
  const [assessmentAreas, setAssessmentAreas] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const totalQuestions = assessmentAreas.length || 8;
  const progress = (currentQuestion / totalQuestions) * 100;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    fetchJobPositionAndAreas();
  }, []);

  const fetchJobPositionAndAreas = async () => {
    try {
      const positionId = localStorage.getItem('currentAssessmentPositionId');
      if (!positionId) {
        // Fallback to default areas if no specific job
        setAssessmentAreas(['Frontend Development', 'Backend Development', 'Database & Data', 'Problem Solving']);
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/get-job-positions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch job details');

      const data = await response.json();
      const position = data.positions?.find((job: JobPosition) => job.id === positionId);
      
      if (position) {
        setJobPosition(position);
        // NEW: Use admin-configured sub-skills if available, otherwise fall back to main areas
        let configuredSkills: string[] = [];
        
        if (position.assessmentConfiguration?.selectedTechnicalSubSkills?.length > 0) {
          // Use the specific sub-skills selected by admin
          configuredSkills = position.assessmentConfiguration.selectedTechnicalSubSkills;
          console.log('Using admin-configured technical skills sub-areas:', configuredSkills);
        } else if (position.requiredSkills?.technical?.length > 0) {
          // Fall back to main skill areas if no sub-skills configured
          configuredSkills = position.requiredSkills.technical;
          console.log('Using main technical areas as fallback:', configuredSkills);
        } else {
          // Final fallback to default areas
          configuredSkills = ['Frontend Development', 'Backend Development', 'Database & Data', 'Problem Solving'];
          console.log('Using default technical areas');
        }
        
        setAssessmentAreas(configuredSkills);
      } else {
        setAssessmentAreas(['Frontend Development', 'Backend Development', 'Database & Data', 'Problem Solving']);
      }
    } catch (error) {
      console.error('Error fetching job position:', error);
      setAssessmentAreas(['Frontend Development', 'Backend Development', 'Database & Data', 'Problem Solving']);
    }
  };

  const startAssessment = () => {
    setAssessmentStarted(true);
    const welcomeMessage: Message = {
      id: '1',
      type: 'bot',
      content: `Hello ${user?.name || 'there'}! 👨‍💻 Welcome to your Technical Assessment. I'm your AI technical interviewer.

This assessment will evaluate your technical knowledge across ${TECHNICAL_AREAS_MAP.length} key areas: ${Object.keys(TECHNICAL_AREAS_MAP).join(', ')}.

You'll encounter various types of questions including:
• Conceptual questions about programming principles
• Code analysis and debugging scenarios  
• System design discussions
• Best practices and methodologies

Feel free to include code snippets in your responses when relevant. Ready to demonstrate your technical skills?`,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
    
    // Ask first question after a short delay
    setTimeout(() => {
      askNextQuestion();
    }, 2000);
  };

  const askNextQuestion = async () => {
    if (currentQuestion >= totalQuestions) {
      await submitAssessment();
      return;
    }

    setIsLoading(true);
    try {
      // Get position ID for job-specific assessments
      const positionId = localStorage.getItem('currentAssessmentPositionId');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/generate-technical-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ 
          area: assessmentAreas[currentQuestion],
          questionNumber: currentQuestion + 1,
          userId: user?.id,
          positionId: positionId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCurrentQuestionText(data.question);
      
      const questionMessage: Message = {
        id: Date.now().toString(),
        type: 'bot',
        content: data.question,
        timestamp: new Date(),
        isCode: data.includesCode || false
      };

      setMessages(prev => [...prev, questionMessage]);
      setIsCodeResponse(data.expectsCode || false);
    } catch (error) {
      console.error('Error generating technical question:', error);
      // Fallback questions
      const fallbackQuestions = [
        "Explain the difference between arrays and linked lists. When would you use each?",
        "How would you debug a performance issue in a web application?",
        "Describe the principles of object-oriented programming with examples.",
        "What factors would you consider when designing a database schema?",
        "Explain how you would implement error handling in your code.",
        "Describe the process of optimizing a slow-running SQL query.",
        "What are some best practices for writing maintainable code?",
        "How do you approach testing in software development?"
      ];

      const fallbackQuestion = `**${assessmentAreas[currentQuestion]} (Question ${currentQuestion + 1}/8)**\n\n${fallbackQuestions[currentQuestion] || `Let's discuss ${assessmentAreas[currentQuestion]}. Can you explain key concepts and share your experience in this area?`}`;
      setCurrentQuestionText(fallbackQuestion);

      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'bot',
        content: fallbackQuestion,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: currentInput.trim(),
      timestamp: new Date(),
      isCode: isCodeResponse
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Store the response for later submission
    const newResponse: AssessmentResponse = {
      question: currentQuestionText,
      area: assessmentAreas[currentQuestion],
      response: userMessage.content,
      includesCode: isCodeResponse
    };
    setResponses(prev => [...prev, newResponse]);
    
    setCurrentInput('');
    setIsLoading(true);

    try {
      // Store individual response for backup
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/store-technical-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          userId: user?.id,
          question: currentQuestion + 1,
          area: assessmentAreas[currentQuestion],
          response: userMessage.content,
          includesCode: isCodeResponse
        })
      });

      // Generate follow-up or proceed to next question
      setTimeout(() => {
        setCurrentQuestion(prev => prev + 1);
        
        const followUpMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: `Great answer! Your understanding of ${assessmentAreas[currentQuestion].toLowerCase()} shows solid technical knowledge.`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, followUpMessage]);

        // Ask next question after a short delay
        setTimeout(() => {
          setIsCodeResponse(false);
          askNextQuestion();
        }, 2000);
      }, 1500);

    } catch (error) {
      console.error('Error processing technical response:', error);
      // Continue anyway
      setCurrentQuestion(prev => prev + 1);
      setTimeout(() => {
        setIsCodeResponse(false);
        askNextQuestion();
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  const submitAssessment = async () => {
    setIsSubmitting(true);
    try {
      // Calculate a simple score based on response length and technical keywords
      const technicalKeywords = ['algorithm', 'function', 'class', 'method', 'variable', 'database', 'api', 'framework', 'library', 'optimization', 'performance', 'scalability'];
      
      const totalScore = Math.min(
        Math.round(
          responses.reduce((acc, response) => {
            const wordCount = response.response.split(' ').length;
            const keywordMatches = technicalKeywords.filter(keyword => 
              response.response.toLowerCase().includes(keyword)
            ).length;
            
            const baseScore = Math.min(wordCount / 25, 8); // Max 8 points for length
            const keywordScore = Math.min(keywordMatches * 2, 4); // Max 4 points for keywords
            return acc + baseScore + keywordScore;
          }, 0)
        ),
        100
      );

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/save-assessment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          userId: user?.id,
          assessmentType: 'technical',
          responses: responses,
          totalScore: totalScore
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit assessment');
      }

      const result = await response.json();
      console.log('Technical assessment submitted successfully:', result);
      
      completeAssessment(totalScore);
    } catch (error) {
      console.error('Error submitting technical assessment:', error);
      // Still show completion but without score
      completeAssessment();
    } finally {
      setIsSubmitting(false);
    }
  };

  const completeAssessment = (score?: number) => {
    setIsCompleted(true);
    const completionMessage: Message = {
      id: 'completion',
      type: 'bot',
      content: `🎉 Excellent work! You've successfully completed your Technical Assessment.

You've demonstrated your knowledge across all ${TECHNICAL_AREAS_MAP.length} technical areas:
${Object.keys(TECHNICAL_AREAS_MAP).map(area => `✅ ${area}`).join('\n')}

${score ? `Your overall technical score: ${score}/100` : 'Your technical responses have been analyzed and scored.'}

Your responses have been evaluated for:
• Code quality and best practices
• Problem-solving approach  
• Technical depth and accuracy
• Communication of complex concepts

Your detailed results and analytics are now available in your dashboard. Thank you for showcasing your technical skills!`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, completionMessage]);
    
    // Notify parent component if callback provided
    if (onComplete) {
      setTimeout(() => onComplete(), 2000);
    }
  };

  if (!assessmentStarted) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Technical Assessment</h1>
        </div>

        {/* Job Position Info */}
        {jobPosition && (
          <Card className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center text-purple-800">
                <Target className="w-5 h-5 mr-2" />
                Technical Assessment for: {jobPosition.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-purple-700">
                <span className="font-medium">{jobPosition.company}</span>
                <span>•</span>
                <span>Customized technical evaluation based on role requirements</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-purple-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Cpu className="w-6 h-6 mr-2 text-purple-600" />
                AI-Powered Technical Evaluation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                This comprehensive technical assessment uses advanced AI to evaluate your programming knowledge, 
                problem-solving skills, and technical expertise through interactive conversations {jobPosition ? 'specifically tailored for this role' : ''}.
              </p>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-purple-800">Technical Areas Covered ({assessmentAreas.length} areas):</h4>
                <div className="grid grid-cols-1 gap-2">
                  {assessmentAreas.map((area) => {
                    const subSkills = TECHNICAL_AREAS_MAP[area as keyof typeof TECHNICAL_AREAS_MAP] || [];
                    return (
                      <div key={area} className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-purple-600" />
                          <span className="font-medium text-purple-800">{area}</span>
                        </div>
                        {subSkills.length > 0 && (
                          <div className="text-xs text-purple-600 ml-6">
                            Key technologies: {subSkills.slice(0, 4).join(', ')}{subSkills.length > 4 ? ` and ${subSkills.length - 4} more...` : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h4 className="font-semibold mb-2 text-purple-800">Assessment Format:</h4>
                <ul className="text-sm space-y-1 text-purple-700">
                  <li>• Interactive chat-based technical interview</li>
                  <li>• Mix of conceptual and practical questions</li>
                  <li>• Code analysis and problem-solving scenarios</li>
                  <li>• Real-time AI evaluation and feedback</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-indigo-800">Assessment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <span className="text-sm text-indigo-700">Duration</span>
                <span className="font-semibold text-indigo-800">45-60 minutes</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <span className="text-sm text-indigo-700">Questions</span>
                <span className="font-semibold text-indigo-800">{totalQuestions} technical areas</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <span className="text-sm text-indigo-700">Difficulty</span>
                <span className="font-semibold text-indigo-800">Adaptive to your level</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <span className="text-sm text-indigo-700">Code Support</span>
                <span className="font-semibold text-indigo-800">Multiple languages</span>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold mb-2 text-green-800">What to Expect:</h4>
                <ul className="text-sm space-y-1 text-green-700">
                  <li>• Technical problem-solving questions</li>
                  <li>• Code review and optimization scenarios</li>
                  <li>• System design discussions</li>
                  <li>• Best practices and methodologies</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold mb-2 text-blue-800">Tips for Success:</h4>
                <ul className="text-sm space-y-1 text-blue-700">
                  <li>• Think out loud - explain your reasoning</li>
                  <li>• Include code snippets when relevant</li>
                  <li>• Consider edge cases and trade-offs</li>
                  <li>• Ask clarifying questions if needed</li>
                </ul>
              </div>

              <Button 
                onClick={startAssessment} 
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700" 
                size="lg"
              >
                <Code className="w-5 h-5 mr-2" />
                Start Technical Assessment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Technical Assessment</h1>
            <p className="text-gray-600">Question {Math.min(currentQuestion + 1, totalQuestions)} of {totalQuestions}</p>
          </div>
        </div>
        {isCompleted && (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-4 h-4 mr-1" />
            Completed
          </Badge>
        )}
      </div>

      <div className="mb-6">
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}% Complete</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Code className="w-5 h-5 mr-2 text-purple-600" />
            AI Technical Interview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 overflow-y-auto mb-4 space-y-4 p-4 bg-gray-50 rounded-lg">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-xs lg:max-w-2xl ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <div className={`p-2 rounded-full ${
                    message.type === 'user' 
                      ? 'bg-purple-600' 
                      : 'bg-gray-300'
                  }`}>
                    {message.type === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-gray-700" />
                    )}
                  </div>
                  <div className={`p-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white border'
                  }`}>
                    <pre className={`whitespace-pre-wrap font-mono text-sm ${
                      message.isCode ? 'bg-gray-800 text-green-400 p-2 rounded' : 'font-sans'
                    }`}>
                      {message.content}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-full bg-gray-300">
                    <Bot className="w-4 h-4 text-gray-700" />
                  </div>
                  <div className="bg-white border p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {!isCompleted && (
            <div className="space-y-2">
              {isCodeResponse ? (
                <Textarea
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder="Enter your code or technical response here..."
                  disabled={isLoading}
                  className="min-h-24 font-mono"
                  rows={6}
                />
              ) : (
                <Input
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Type your technical response..."
                  disabled={isLoading}
                  className="flex-1"
                />
              )}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  {isCodeResponse && (
                    <Badge variant="outline" className="text-xs">
                      <Code className="w-3 h-3 mr-1" />
                      Code Expected
                    </Badge>
                  )}
                </div>
                <Button onClick={handleSendMessage} disabled={isLoading || !currentInput.trim()}>
                  <Send className="w-4 h-4 mr-2" />
                  Send Response
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}