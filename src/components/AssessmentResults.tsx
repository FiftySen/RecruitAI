import { useState, useEffect } from 'react';
import { ArrowLeft, TrophyIcon, BarChart3, PieChart, Download } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { useAuth } from '../App';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart as RechartsPieChart, Cell } from 'recharts';

interface AssessmentResult {
  userId: string;
  type: string;
  totalScore: number;
  categoryScores: Record<string, number>;
  responses: any[];
  completedAt: string;
  submittedAt: string;
}

interface AssessmentResultsProps {
  onBack: () => void;
}

export function AssessmentResults({ onBack }: AssessmentResultsProps) {
  const { user } = useAuth();
  const [results, setResults] = useState<{
    softSkillsResult?: AssessmentResult;
    technicalResult?: AssessmentResult;
    hasResults: boolean;
  }>({ hasResults: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, [user]);

  const loadResults = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6ead2a10/get-assessment-results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        throw new Error('Failed to load results');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error('Load results error:', err);
      setError('Failed to load assessment results');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return { text: 'Excellent', variant: 'default' as const };
    if (score >= 80) return { text: 'Very Good', variant: 'secondary' as const };
    if (score >= 70) return { text: 'Good', variant: 'secondary' as const };
    if (score >= 60) return { text: 'Fair', variant: 'outline' as const };
    return { text: 'Needs Improvement', variant: 'destructive' as const };
  };

  const prepareRadarData = (categoryScores: Record<string, number>) => {
    return Object.entries(categoryScores).map(([category, score]) => ({
      category: category.length > 15 ? category.substring(0, 12) + '...' : category,
      score,
      fullCategory: category
    }));
  };

  const prepareBarData = (categoryScores: Record<string, number>) => {
    return Object.entries(categoryScores).map(([category, score]) => ({
      category: category.length > 10 ? category.substring(0, 8) + '...' : category,
      score,
      fullCategory: category
    }));
  };

  const pieColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff', '#00ffff', '#ffff00'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center mb-8">
            <Button variant="ghost" onClick={onBack} className="mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-4">Loading your results...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!results.hasResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center mb-8">
            <Button variant="ghost" onClick={onBack} className="mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <Card className="p-8 text-center">
            <TrophyIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="mb-4">No Assessment Results Found</h2>
            <p className="text-gray-600 mb-6">
              Complete your soft skills or technical assessments to see detailed results and analytics here.
            </p>
            <Button onClick={onBack}>
              Take Assessment
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="mb-2">Assessment Results & Analytics</h1>
          <p className="text-gray-600">
            Detailed breakdown of your assessment performance and growth areas
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="soft-skills" disabled={!results.softSkillsResult}>
              Soft Skills
            </TabsTrigger>
            <TabsTrigger value="technical" disabled={!results.technicalResult}>
              Technical
            </TabsTrigger>
            <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {results.softSkillsResult && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3>Soft Skills Assessment</h3>
                    <Badge {...getScoreBadge(results.softSkillsResult.totalScore)}>
                      {getScoreBadge(results.softSkillsResult.totalScore).text}
                    </Badge>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Overall Score</span>
                      <span className={`text-2xl font-bold ${getScoreColor(results.softSkillsResult.totalScore)}`}>
                        {results.softSkillsResult.totalScore}/100
                      </span>
                    </div>
                    <Progress value={results.softSkillsResult.totalScore} className="h-3" />
                    <div className="text-sm text-gray-600">
                      Completed: {new Date(results.softSkillsResult.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                </Card>
              )}

              {results.technicalResult && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3>Technical Assessment</h3>
                    <Badge {...getScoreBadge(results.technicalResult.totalScore)}>
                      {getScoreBadge(results.technicalResult.totalScore).text}
                    </Badge>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Overall Score</span>
                      <span className={`text-2xl font-bold ${getScoreColor(results.technicalResult.totalScore)}`}>
                        {results.technicalResult.totalScore}/100
                      </span>
                    </div>
                    <Progress value={results.technicalResult.totalScore} className="h-3" />
                    <div className="text-sm text-gray-600">
                      Completed: {new Date(results.technicalResult.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {(results.softSkillsResult || results.technicalResult) && (
              <Card className="p-6">
                <h3 className="mb-4">Performance Comparison</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    {
                      category: 'Soft Skills',
                      score: results.softSkillsResult?.totalScore || 0,
                      color: '#8884d8'
                    },
                    {
                      category: 'Technical',
                      score: results.technicalResult?.totalScore || 0,
                      color: '#82ca9d'
                    }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="soft-skills" className="space-y-6">
            {results.softSkillsResult && (
              <>
                <Card className="p-6">
                  <h3 className="mb-4">Soft Skills Radar Chart</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={prepareRadarData(results.softSkillsResult.categoryScores)}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="category" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.3}
                      />
                      <Tooltip 
                        labelFormatter={(label, payload) => {
                          const item = payload?.[0]?.payload;
                          return item?.fullCategory || label;
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-6">
                  <h3 className="mb-4">Category Breakdown</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(results.softSkillsResult.categoryScores).map(([category, score]) => (
                      <div key={category} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{category}</span>
                          <span className={`font-bold ${getScoreColor(score)}`}>{score}/100</span>
                        </div>
                        <Progress value={score} className="h-2" />
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="technical" className="space-y-6">
            {results.technicalResult && (
              <>
                <Card className="p-6">
                  <h3 className="mb-4">Technical Skills Chart</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={prepareBarData(results.technicalResult.categoryScores)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        labelFormatter={(label, payload) => {
                          const item = payload?.[0]?.payload;
                          return item?.fullCategory || label;
                        }}
                      />
                      <Bar dataKey="score" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-6">
                  <h3 className="mb-4">Technical Area Scores</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(results.technicalResult.categoryScores).map(([area, score]) => (
                      <div key={area} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{area}</span>
                          <span className={`font-bold ${getScoreColor(score)}`}>{score}/100</span>
                        </div>
                        <Progress value={score} className="h-2" />
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="detailed" className="space-y-6">
            <Card className="p-6">
              <h3 className="mb-4">Growth Recommendations</h3>
              <div className="space-y-4">
                {results.softSkillsResult && (
                  <div>
                    <h4 className="font-medium mb-2">Soft Skills Development</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      {Object.entries(results.softSkillsResult.categoryScores)
                        .filter(([, score]) => score < 75)
                        .map(([category, score]) => (
                          <li key={category} className="flex items-start">
                            <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            <span>
                              <strong>{category}</strong> (Score: {score}/100) - 
                              Consider practicing {category.toLowerCase()} scenarios and seeking feedback from colleagues.
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}

                {results.technicalResult && (
                  <div>
                    <h4 className="font-medium mb-2">Technical Skills Development</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      {Object.entries(results.technicalResult.categoryScores)
                        .filter(([, score]) => score < 75)
                        .map(([area, score]) => (
                          <li key={area} className="flex items-start">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                            <span>
                              <strong>{area}</strong> (Score: {score}/100) - 
                              Focus on hands-on practice and consider additional coursework in this area.
                            </span>
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="mb-4">Assessment Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Assessments</span>
                  <div className="text-2xl font-bold text-blue-600">
                    {(results.softSkillsResult ? 1 : 0) + (results.technicalResult ? 1 : 0)}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Average Score</span>
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(
                      ((results.softSkillsResult?.totalScore || 0) + (results.technicalResult?.totalScore || 0)) /
                      ((results.softSkillsResult ? 1 : 0) + (results.technicalResult ? 1 : 0))
                    )}/100
                  </div>
                </div>
                <div>
                  <span className="font-medium">Strengths</span>
                  <div className="text-lg font-bold text-purple-600">
                    {[
                      ...(results.softSkillsResult ? Object.entries(results.softSkillsResult.categoryScores) : []),
                      ...(results.technicalResult ? Object.entries(results.technicalResult.categoryScores) : [])
                    ]
                      .filter(([, score]) => score >= 80)
                      .length} Areas
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}