import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter
} from 'recharts';
import { Calendar, TrendingUp, Brain, Clock, Target, Flame, Trophy, AlertCircle, Zap, BookOpen, Radar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AnalyticsService } from '../lib/analyticsService';
import { AdvancedAnalyticsService } from '../lib/advancedAnalyticsService';
import type { StudyPack } from '../context/StudyPackContext';

interface AdvancedAnalyticsProps {
  studyPackId: string;
  studyPack: StudyPack;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

export default function AdvancedAnalytics({ studyPackId, studyPack }: AdvancedAnalyticsProps) {
  const [learningCurveData, setLearningCurveData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [topicPerformanceData, setTopicPerformanceData] = useState<any[]>([]);
  const [masteryInsights, setMasteryInsights] = useState<any>(null);
  const [predictiveData, setPredictiveData] = useState<any[]>([]);
  const [retentionCurve, setRetentionCurve] = useState<any[]>([]);
  const [difficultyDistribution, setDifficultyDistribution] = useState<any[]>([]);
  const [timePatterns, setTimePatterns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [studyPackId]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    try {
      const [
        learningCurve,
        heatmap,
        topicPerformance,
        mastery,
        predictive,
        retention,
        difficulty,
        timePattern
      ] = await Promise.all([
        AdvancedAnalyticsService.generateLearningCurve(studyPackId),
        AdvancedAnalyticsService.generateStudyHeatmap(studyPackId),
        AdvancedAnalyticsService.generateTopicPerformance(studyPackId, studyPack),
        AdvancedAnalyticsService.generateMasteryInsights(studyPackId, studyPack),
        AdvancedAnalyticsService.generatePredictiveInsights(studyPackId),
        AdvancedAnalyticsService.generateRetentionCurve(studyPackId),
        AdvancedAnalyticsService.generateDifficultyDistribution(studyPackId),
        AdvancedAnalyticsService.generateTimePatterns(studyPackId)
      ]);

      setLearningCurveData(learningCurve);
      setHeatmapData(heatmap);
      setTopicPerformanceData(topicPerformance);
      setMasteryInsights(mastery);
      setPredictiveData(predictive);
      setRetentionCurve(retention);
      setDifficultyDistribution(difficulty);
      setTimePatterns(timePattern);
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTooltipValue = (value: any, name: string) => {
    if (name === 'accuracy' || name === 'confidence' || name === 'retention') {
      return `${Math.round(value * 100)}%`;
    }
    if (name === 'studyTime') {
      return `${value}m`;
    }
    return value;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((pld: any, index: number) => (
            <p key={index} style={{ color: pld.color }}>
              {`${pld.dataKey}: ${formatTooltipValue(pld.value, pld.dataKey)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Analyzing Your Learning Data...
          </h3>
          <p className="text-muted-foreground">
            Generating advanced insights and visualizations
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Advanced Analytics</h2>
        <p className="text-muted-foreground">
          Deep insights into your learning patterns and performance trends
        </p>
      </div>

      <Tabs defaultValue="learning-curve" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="learning-curve">Learning Curve</TabsTrigger>
          <TabsTrigger value="heatmap">Study Heatmap</TabsTrigger>
          <TabsTrigger value="topics">Topic Analysis</TabsTrigger>
          <TabsTrigger value="mastery">Mastery Insights</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="learning-curve">
          <div className="space-y-6">
            {/* Learning Curve Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Learning Progress Over Time</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={learningCurveData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="accuracy" 
                        stroke="#8884d8" 
                        strokeWidth={3}
                        dot={{ fill: '#8884d8', strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="confidence" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Predictive Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>AI Predictive Insights</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={predictiveData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="predicted" 
                        stackId="1"
                        stroke="#ffc658" 
                        fill="#ffc658"
                        fillOpacity={0.6}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="confidence" 
                        stackId="2"
                        stroke="#ff7c7c" 
                        fill="#ff7c7c"
                        fillOpacity={0.4}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {predictiveData.length > 0 && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">🔮 AI Predictions</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Estimated Mastery:</span>
                        <span className="ml-2 text-blue-700">
                          {predictiveData[predictiveData.length - 1]?.estimatedMastery || 'In 2-3 weeks'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Confidence Level:</span>
                        <span className="ml-2 text-blue-700">
                          {Math.round((predictiveData[predictiveData.length - 1]?.confidence || 0.8) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="heatmap">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Study Intensity Heatmap</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {heatmapData.map((day, index) => (
                  <div
                    key={index}
                    className={`aspect-square rounded-sm border border-border ${getHeatmapColor(day.intensity)}`}
                    title={`${day.date}: ${day.studyTime}m study time`}
                  >
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {day.studyTime > 0 ? day.studyTime : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                <span>Less</span>
                <div className="flex space-x-1">
                  <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
                  <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
                  <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
                  <div className="w-3 h-3 bg-green-800 rounded-sm"></div>
                </div>
                <span>More</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="topics">
          <div className="space-y-6">
            {/* Topic Performance Radar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Topic Performance Radar</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={topicPerformanceData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="topic" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Radar 
                        name="Accuracy" 
                        dataKey="accuracy" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.3}
                      />
                      <Radar 
                        name="Speed" 
                        dataKey="speed" 
                        stroke="#82ca9d" 
                        fill="#82ca9d" 
                        fillOpacity={0.3}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Topic Comparison Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart className="h-5 w-5" />
                  <span>Topic Performance Comparison</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topicPerformanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="topic" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="accuracy" fill="#8884d8" />
                      <Bar dataKey="timeSpent" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mastery">
          <div className="space-y-6">
            {/* Mastery Overview */}
            {masteryInsights && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Overall Mastery</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary mb-2">
                        {Math.round(masteryInsights.overallMastery * 100)}%
                      </div>
                      <Progress value={masteryInsights.overallMastery * 100} className="mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {getMasteryLevel(masteryInsights.overallMastery)}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Learning Velocity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2">
                        {masteryInsights.learningVelocity}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        concepts per day
                      </p>
                      <div className="flex items-center justify-center mt-2">
                        <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                        <span className="text-sm text-green-600">Improving</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Time to Mastery</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {masteryInsights.estimatedDaysToMastery}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        days remaining
                      </p>
                      <div className="flex items-center justify-center mt-2">
                        <Clock className="h-4 w-4 text-blue-600 mr-1" />
                        <span className="text-sm text-blue-600">On track</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Difficulty Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Difficulty Level Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={difficultyDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {difficultyDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Mastery Recommendations */}
            {masteryInsights && masteryInsights.recommendations && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5" />
                    <span>AI Mastery Recommendations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {masteryInsights.recommendations.map((rec: any, index: number) => (
                      <div key={index} className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
                        <div className="flex-shrink-0">
                          {rec.priority === 'high' ? (
                            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                          ) : (
                            <Brain className="h-5 w-5 text-blue-500 mt-0.5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-foreground">{rec.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                          {rec.estimatedImpact && (
                            <div className="mt-2">
                              <Badge variant="secondary" className="text-xs">
                                +{rec.estimatedImpact}% improvement potential
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="retention">
          <div className="space-y-6">
            {/* Retention Curve */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>Knowledge Retention Curve</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={retentionCurve}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timeAfterStudy" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="retention" 
                        stroke="#8884d8" 
                        strokeWidth={3}
                        dot={{ fill: '#8884d8', strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="idealRetention" 
                        stroke="#82ca9d" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Retention Analysis */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Retention Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">24-hour retention</span>
                      <span className="font-medium">85%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">7-day retention</span>
                      <span className="font-medium">72%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">30-day retention</span>
                      <span className="font-medium">58%</span>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Forgetting Rate</span>
                        <Badge variant="outline">Normal</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Optimal Review Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Review in 1 day</span>
                      <Badge variant="secondary" className="ml-auto">12 cards</Badge>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Review in 3 days</span>
                      <Badge variant="secondary" className="ml-auto">8 cards</Badge>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Review in 7 days</span>
                      <Badge variant="secondary" className="ml-auto">5 cards</Badge>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm">Review in 14 days</span>
                      <Badge variant="secondary" className="ml-auto">3 cards</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="patterns">
          <div className="space-y-6">
            {/* Time Patterns */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Study Time Patterns</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timePatterns}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="studyTime" fill="#8884d8" />
                      <Bar dataKey="accuracy" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Performance Scatter */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Performance vs Study Time Correlation</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      data={learningCurveData}
                      margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="studyTime" name="Study Time (min)" />
                      <YAxis type="number" dataKey="accuracy" name="Accuracy" />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                      <Scatter name="Sessions" data={learningCurveData} fill="#8884d8" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Pattern Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>AI Pattern Analysis</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Peak Performance Times</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm">Best: 2-4 PM (94% accuracy)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Flame className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">Most Active: 7-9 PM</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <BookOpen className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">Longest Sessions: Weekends</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Learning Patterns</h4>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">Optimal Session Length:</span>
                        <span className="ml-2">25-30 minutes</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Break Frequency:</span>
                        <span className="ml-2">Every 45 minutes</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Best Day:</span>
                        <span className="ml-2">Tuesday</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getHeatmapColor(intensity: number): string {
  if (intensity === 0) return 'bg-gray-100';
  if (intensity <= 0.2) return 'bg-green-200';
  if (intensity <= 0.4) return 'bg-green-400';
  if (intensity <= 0.6) return 'bg-green-600';
  if (intensity <= 0.8) return 'bg-green-700';
  return 'bg-green-800';
}

function getMasteryLevel(mastery: number): string {
  if (mastery >= 0.9) return 'Expert Level';
  if (mastery >= 0.8) return 'Advanced';
  if (mastery >= 0.7) return 'Proficient';
  if (mastery >= 0.6) return 'Intermediate';
  if (mastery >= 0.4) return 'Developing';
  return 'Beginner';
}
