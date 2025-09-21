import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ArrowLeft, Send, Bot, User, CheckCircle, Clock, Users, Target, Brain, CheckCircle2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface SoftSkillsAssessmentProps {
  onBack: () => void;
  onComplete?: () => void;
}

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
}

interface AssessmentResponse {
  question: string;
  topic: string;
  response: string;
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
    selectedSoftSkillsSubAreas?: string[];
  };
}

// Comprehensive soft skills areas mapping
const SOFT_SKILLS_AREAS_MAP = {
  'Communication': [
    'Verbal Communication', 'Written Communication', 'Active Listening',
    'Presentation Skills', 'Cross-cultural Communication', 'Conflict Resolution',
    'Public Speaking', 'Documentation', 'Technical Writing', 'Client Communication'
  ],
  'Leadership': [
    'Team Leadership', 'Strategic Thinking', 'Decision Making',
    'Mentoring', 'Change Management', 'Vision Setting',
    'Delegation', 'Performance Management', 'Coaching', 'Influence & Persuasion'
  ],
  'Problem Solving': [
    'Analytical Thinking', 'Creative Problem Solving', 'Critical Thinking',
    'Root Cause Analysis', 'Systems Thinking', 'Innovation',
    'Troubleshooting', 'Research Skills', 'Logic & Reasoning', 'Pattern Recognition'
  ],
  'Collaboration': [
    'Teamwork', 'Cross-functional Collaboration', 'Stakeholder Management',
    'Negotiation', 'Consensus Building', 'Partnership Building',
    'Knowledge Sharing', 'Peer Review', 'Agile Collaboration', 'Remote Teamwork'
  ],
  'Adaptability': [
    'Change Adaptation', 'Learning Agility', 'Flexibility',
    'Resilience', 'Stress Management', 'Growth Mindset',
    'Continuous Learning', 'Technology Adoption', 'Cultural Adaptability', 'Innovation Mindset'
  ],
  'Time Management': [
    'Prioritization', 'Project Management', 'Deadline Management',
    'Multitasking', 'Planning', 'Efficiency',
    'Resource Management', 'Goal Setting', 'Task Organization', 'Work-Life Balance'
  ]
};

export function SoftSkillsAssessment({ onBack, onComplete }: SoftSkillsAssessmentProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
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
        setAssessmentAreas(['Communication', 'Teamwork', 'Leadership', 'Problem Solving', 'Adaptability', 'Time Management']);
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
        
        if (position.assessmentConfiguration?.selectedSoftSkillsSubAreas?.length > 0) {
          // Use the specific sub-skills selected by admin
          configuredSkills = position.assessmentConfiguration.selectedSoftSkillsSubAreas;
          console.log('Using admin-configured soft skills sub-areas:', configuredSkills);
        } else if (position.requiredSkills?.softSkills?.length > 0) {
          // Fall back to main skill areas if no sub-skills configured
          configuredSkills = position.requiredSkills.softSkills;
          console.log('Using main skill areas as fallback:', configuredSkills);
        } else {
          // Final fallback to default areas
          configuredSkills = ['Communication', 'Problem Solving', 'Collaboration', 'Leadership'];
          console.log('Using default skill areas');
        }
        
        setAssessmentAreas(configuredSkills);
      } else {
        setAssessmentAreas(['Communication', 'Problem Solving', 'Collaboration', 'Leadership']);
      }
    } catch (error) {
      console.error('Error fetching job position:', error);
      setAssessmentAreas(['Communication', 'Problem Solving', 'Collaboration', 'Leadership']);
    }
  };

  const startAssessment = () => {
    setAssessmentStarted(true);
    const welcomeMessage: Message = {
      id: '1',
      type: 'bot',
      content: `Hello ${user?.name || 'there'}! 👋 Welcome to your Soft Skills Assessment. I'm your AI interviewer, and I'll be asking you questions about various interpersonal and behavioral scenarios.

This assessment covers ${assessmentAreas.join(', ')}.

Each question is designed to understand how you handle real-world situations. Please answer honestly and provide specific examples when possible. Ready to begin?`,
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
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/generate-soft-skill-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ 
          topic: assessmentAreas[currentQuestion],
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
        timestamp: new Date()
      };

      setMessages(prev => [...prev, questionMessage]);
    } catch (error) {
      console.error('Error generating question:', error);
      // Use fallback question when API fails
      const fallbackQuestion = `**${assessmentAreas[currentQuestion]} (Question ${currentQuestion + 1}/8)**\n\nTell me about a time when you had to demonstrate strong ${assessmentAreas[currentQuestion].toLowerCase()} skills. What was the situation, what actions did you take, and what was the outcome?`;
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
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Store the response for later submission
    const newResponse: AssessmentResponse = {
      question: currentQuestionText,
      topic: assessmentAreas[currentQuestion],
      response: userMessage.content
    };
    setResponses(prev => [...prev, newResponse]);
    
    setCurrentInput('');
    setIsLoading(true);

    try {
      // Store individual response for backup
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/store-soft-skill-response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          userId: user?.id,
          question: currentQuestion + 1,
          topic: assessmentAreas[currentQuestion],
          response: userMessage.content
        })
      });

      // Generate follow-up or proceed to next question
      setTimeout(() => {
        setCurrentQuestion(prev => prev + 1);
        
        const followUpMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: `Thank you for sharing that example. Your response shows good insight into ${assessmentAreas[currentQuestion].toLowerCase()}.`,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, followUpMessage]);

        // Ask next question after a short delay
        setTimeout(() => {
          askNextQuestion();
        }, 2000);
      }, 1500);

    } catch (error) {
      console.error('Error processing response:', error);
      // Continue anyway
      setCurrentQuestion(prev => prev + 1);
      setTimeout(() => {
        askNextQuestion();
      }, 1000);
    } finally {
      setIsLoading(false);
    }
  };

  const submitAssessment = async () => {
    setIsSubmitting(true);
    try {
      // Calculate a simple score based on response length and content quality
      const totalScore = Math.min(
        Math.round(
          responses.reduce((acc, response) => {
            const wordCount = response.response.split(' ').length;
            const baseScore = Math.min(wordCount / 20, 10); // Max 10 points per response
            return acc + baseScore;
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
          assessmentType: 'soft-skills',
          responses: responses,
          totalScore: totalScore
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit assessment');
      }

      const result = await response.json();
      console.log('Assessment submitted successfully:', result);
      
      completeAssessment(totalScore);
    } catch (error) {
      console.error('Error submitting assessment:', error);
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
      content: `🎉 Congratulations! You've successfully completed your Soft Skills Assessment. 

You've demonstrated insights across all ${totalQuestions} key areas:
${assessmentAreas.map(topic => `✅ ${topic}`).join('\n')}

${score ? `Your overall score: ${score}/100` : 'Your responses have been analyzed and scored.'}

Your detailed results and analytics are now available in your dashboard. Thank you for taking the time to complete this assessment!`,
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
          <h1 className="text-2xl font-bold">Soft Skills Assessment</h1>
        </div>

        {/* Job Position Info */}
        {jobPosition && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center text-blue-800">
                <Target className="w-5 h-5 mr-2" />
                Assessment for: {jobPosition.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-blue-700">
                <span className="font-medium">{jobPosition.company}</span>
                <span>•</span>
                <span>Customized assessment based on role requirements</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-blue-200 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="w-6 h-6 mr-2 text-blue-600" />
                AI-Powered Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                This assessment uses advanced AI to evaluate your soft skills through natural conversation. 
                You'll engage in a chat-based interview covering key interpersonal abilities {jobPosition ? 'specifically required for this role' : ''}.
              </p>
              
              <div className="space-y-3">
                <h4 className="font-semibold text-blue-800">Assessment Coverage ({assessmentAreas.length} areas):</h4>
                <div className="grid grid-cols-1 gap-2">
                  {assessmentAreas.map((area) => {
                    const subSkills = SOFT_SKILLS_AREAS_MAP[area as keyof typeof SOFT_SKILLS_AREAS_MAP] || [];
                    return (
                      <div key={area} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-blue-800">{area}</span>
                        </div>
                        {subSkills.length > 0 && (
                          <div className="text-xs text-blue-600 ml-6">
                            Focus areas: {subSkills.slice(0, 4).join(', ')}{subSkills.length > 4 ? ` and ${subSkills.length - 4} more...` : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-semibold mb-2 text-blue-800">Tips for Success:</h4>
                <ul className="text-sm space-y-1 text-blue-700">
                  <li>• Provide specific examples from your experience</li>
                  <li>• Be honest and authentic in your responses</li>
                  <li>• Take your time to think through each question</li>
                  <li>• Use the STAR method (Situation, Task, Action, Result)</li>
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
                <span className="font-semibold text-indigo-800">20-30 minutes</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <span className="text-sm text-indigo-700">Questions</span>
                <span className="font-semibold text-indigo-800">{totalQuestions} skill areas</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <span className="text-sm text-indigo-700">Format</span>
                <span className="font-semibold text-indigo-800">AI Chat Interview</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <span className="text-sm text-indigo-700">Scoring</span>
                <span className="font-semibold text-indigo-800">Automated AI Analysis</span>
              </div>

              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold mb-2 text-green-800">What to Expect:</h4>
                <ul className="text-sm space-y-1 text-green-700">
                  <li>• Interactive conversation with AI interviewer</li>
                  <li>• Scenario-based questions</li>
                  <li>• Real-time adaptive questioning</li>
                  <li>• Immediate feedback and scoring</li>
                </ul>
              </div>

              <Button 
                onClick={startAssessment} 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
                size="lg"
              >
                <Users className="w-5 h-5 mr-2" />
                Start Soft Skills Assessment
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
            <h1 className="text-2xl font-bold">Soft Skills Assessment</h1>
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
            <Bot className="w-5 h-5 mr-2 text-blue-600" />
            AI Assessment Chat
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 overflow-y-auto mb-4 space-y-4 p-4 bg-gray-50 rounded-lg">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}>
                  <div className={`p-2 rounded-full ${
                    message.type === 'user' 
                      ? 'bg-blue-600' 
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
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border'
                  }`}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
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
            <div className="flex space-x-2">
              <Input
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Type your response..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={isLoading || !currentInput.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}