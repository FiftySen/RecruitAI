import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// This component will now manage the entire chat-based assessment
export function SoftSkillsAssessment() {
  const { user } = useAuth();
  const [sessionKey, setSessionKey] = useState<string | null>(null);
  const [history, setHistory] = useState<{ speaker: 'ai' | 'user'; text: string }[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom of the chat window on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Step 1: Start the assessment when the component mounts
  useEffect(() => {
    const startAssessment = async () => {
      setIsLoading(true);
      try {
        const positionId = localStorage.getItem('currentAssessmentPositionId');
        if (!user?.id || !positionId) {
          throw new Error("User or Position ID not found. Please start from the dashboard.");
        }

        const response = await fetch('/make-server-6ead2a10/start-assessment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, positionId }),
        });

        if (!response.ok) throw new Error('Failed to start the assessment.');

        const data = await response.json();
        
        setSessionKey(data.sessionKey);
        setHistory([{ speaker: 'ai', text: data.firstQuestion }]);
      } catch (error) {
        toast.error(error.message);
        setHistory([{ speaker: 'ai', text: "Sorry, I couldn't start the assessment. Please try again later." }]);
      } finally {
        setIsLoading(false);
      }
    };
    startAssessment();
  }, [user]);

  // Step 2: Handle sending a message to the orchestrator
  const handleSendMessage = async () => {
    if (!currentInput.trim() || !sessionKey || isLoading || isCompleted) return;

    const newUserMessage = { speaker: 'user' as const, text: currentInput };
    setHistory(prev => [...prev, newUserMessage]);
    const answerToSend = currentInput;
    setCurrentInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/make-server-6ead2a10/submit-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionKey, answer: answerToSend }),
      });
      
      if (!response.ok) throw new Error('Failed to submit answer.');

      const data = await response.json();

      if (data.status === 'completed') {
        setIsCompleted(true);
        setHistory(prev => [...prev, { speaker: 'ai', text: "Thank you. That completes your assessment. You may now close this window." }]);
      } else {
        setHistory(prev => [...prev, { speaker: 'ai', text: data.nextQuestion }]);
      }
    } catch (error) {
      toast.error('There was an error submitting your answer.');
      setHistory(prev => [...prev, { speaker: 'ai', text: "I'm sorry, there was a connection error. Please try sending your answer again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
        <CardHeader className="border-b">
          <CardTitle className="text-xl">Soft Skills Assessment</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
          {history.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.speaker === 'user' ? 'justify-end' : ''}`}>
              {msg.speaker === 'ai' && <div className="p-2 bg-indigo-600 text-white rounded-full"><Bot size={20} /></div>}
              <div className={`max-w-md p-3 rounded-lg ${msg.speaker === 'ai' ? 'bg-gray-100' : 'bg-indigo-500 text-white'}`}>
                {msg.text}
              </div>
              {msg.speaker === 'user' && <div className="p-2 bg-gray-200 text-gray-700 rounded-full"><User size={20} /></div>}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-full"><Bot size={20} /></div>
              <div className="max-w-md p-3 rounded-lg bg-gray-100 flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                AI is typing...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </CardContent>
        {!isCompleted && (
          <div className="border-t p-4">
            <div className="flex items-center gap-2">
              <Input
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your answer here..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={isLoading || !currentInput.trim()}>
                <Send size={16} className="mr-2" /> Send
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}