import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Play, CheckCircle, SkipForward, Target, TrendingUp, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RecommendationService, type StudyPlan, type StudySession } from '../lib/recommendationService';

interface StudyPlanGeneratorProps {
  studyPackId: string;
}

export default function StudyPlanGenerator({ studyPackId }: StudyPlanGeneratorProps) {
  const [availableTime, setAvailableTime] = useState(60);
  const [currentPlan, setCurrentPlan] = useState<StudyPlan | null>(null);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sessionInProgress, setSessionInProgress] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  useEffect(() => {
    loadExistingPlan();
  }, [studyPackId]);

  const loadExistingPlan = () => {
    const plan = RecommendationService.getLatestPlan(studyPackId);
    if (plan && plan.completionRate < 1) {
      setCurrentPlan(plan);
      setCurrentSessionIndex(plan.sessions.findIndex(s => !(s as any).completed));
    }
  };

  const generatePlan = async () => {
    setIsGenerating(true);
    try {
      const plan = await RecommendationService.generateOptimalStudyPlan(studyPackId, availableTime);
      setCurrentPlan(plan);
      setCurrentSessionIndex(0);
    } catch (error) {
      console.error('Failed to generate study plan:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const startSession = (sessionIndex: number) => {
    setCurrentSessionIndex(sessionIndex);
    setSessionInProgress(true);
    setSessionStartTime(new Date());
  };

  const completeSession = () => {
    if (!currentPlan) return;

    const session = currentPlan.sessions[currentSessionIndex];
    if (session) {
      RecommendationService.updatePlanProgress(currentPlan.id, session.id);
      
      // Update local state
      const updatedPlan = { ...currentPlan };
      (updatedPlan.sessions[currentSessionIndex] as any).completed = true;
      const completedCount = updatedPlan.sessions.filter(s => (s as any).completed).length;
      updatedPlan.completionRate = completedCount / updatedPlan.sessions.length;
      
      setCurrentPlan(updatedPlan);
      setSessionInProgress(false);
      setSessionStartTime(null);
      
      // Move to next session
      if (currentSessionIndex < currentPlan.sessions.length - 1) {
        setCurrentSessionIndex(currentSessionIndex + 1);
      }
    }
  };

  const skipSession = () => {
    if (currentSessionIndex < currentPlan!.sessions.length - 1) {
      setCurrentSessionIndex(currentSessionIndex + 1);
    }
    setSessionInProgress(false);
    setSessionStartTime(null);
  };

  const getSessionIcon = (type: string) => {
    switch (type) {
      case 'flashcards':
        return <TrendingUp className="h-4 w-4" />;
      case 'quiz':
        return <Target className="h-4 w-4" />;
      case 'break':
        return <Coffee className="h-4 w-4" />;
      default:
        return <Play className="h-4 w-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getElapsedTime = () => {
    if (!sessionStartTime) return 0;
    return Math.floor((Date.now() - sessionStartTime.getTime()) / 1000 / 60);
  };

  if (!currentPlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>AI Study Plan Generator</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="time-input">Available Study Time (minutes)</Label>
              <Input
                id="time-input"
                type="number"
                min="15"
                max="240"
                value={availableTime}
                onChange={(e) => setAvailableTime(parseInt(e.target.value) || 60)}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Recommended: 30-90 minutes for optimal learning
              </p>
            </div>

            <Button 
              onClick={generatePlan} 
              disabled={isGenerating || availableTime < 15}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Generating Optimal Plan...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Generate AI Study Plan
                </>
              )}
            </Button>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">🧠 AI-Powered Planning</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Analyzes your study patterns and weak areas</li>
                <li>• Optimizes session length for your attention span</li>
                <li>• Prioritizes overdue spaced repetition cards</li>
                <li>• Includes strategic breaks for better retention</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentSession = currentPlan.sessions[currentSessionIndex];
  const isCompleted = currentPlan.completionRate >= 1;

  return (
    <div className="space-y-6">
      {/* Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Your AI Study Plan</span>
            </div>
            <Badge variant="secondary">
              {Math.round(currentPlan.completionRate * 100)}% Complete
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Overall Progress</span>
                <span>{currentPlan.sessions.filter(s => (s as any).completed).length}/{currentPlan.sessions.length} sessions</span>
              </div>
              <Progress value={currentPlan.completionRate * 100} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold text-foreground">{currentPlan.totalDuration}m</div>
                <div className="text-xs text-muted-foreground">Total Time</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold text-foreground">{currentPlan.sessions.length}</div>
                <div className="text-xs text-muted-foreground">Sessions</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold text-foreground">{currentPlan.recommendations.length}</div>
                <div className="text-xs text-muted-foreground">AI Insights</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-lg font-bold text-foreground">
                  {isCompleted ? '✓' : currentSessionIndex + 1}
                </div>
                <div className="text-xs text-muted-foreground">Current</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Session */}
      {!isCompleted && currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {getSessionIcon(currentSession.type)}
              <span>Current Session: {currentSession.type === 'break' ? 'Break Time' : `Study Session ${currentSessionIndex + 1}`}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className={getDifficultyColor(currentSession.difficulty)}>
                    {currentSession.difficulty}
                  </Badge>
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{currentSession.duration} minutes</span>
                  </div>
                </div>
                {sessionInProgress && (
                  <Badge variant="secondary">
                    {getElapsedTime()}/{currentSession.duration}m
                  </Badge>
                )}
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">Session Goals:</h4>
                <ul className="space-y-1">
                  {currentSession.content.map((item, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start space-x-2">
                      <span className="text-primary mt-1">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex space-x-2">
                {!sessionInProgress ? (
                  <Button onClick={() => startSession(currentSessionIndex)} className="flex-1">
                    <Play className="h-4 w-4 mr-2" />
                    Start Session
                  </Button>
                ) : (
                  <Button onClick={completeSession} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Session
                  </Button>
                )}
                <Button variant="outline" onClick={skipSession}>
                  <SkipForward className="h-4 w-4 mr-2" />
                  Skip
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session List */}
      <Card>
        <CardHeader>
          <CardTitle>Session Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentPlan.sessions.map((session, index) => (
              <div
                key={session.id}
                className={`flex items-center space-x-3 p-3 rounded-lg border ${
                  index === currentSessionIndex 
                    ? 'border-primary bg-primary/5' 
                    : (session as any).completed 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-border'
                }`}
              >
                <div className="flex-shrink-0">
                  {(session as any).completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : index === currentSessionIndex ? (
                    <Play className="h-5 w-5 text-primary" />
                  ) : (
                    getSessionIcon(session.type)
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-sm">
                      Session {session.order}: {session.type === 'break' ? 'Break' : session.type}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {session.duration}m
                    </Badge>
                    <Badge variant="outline" className={`text-xs ${getDifficultyColor(session.difficulty)}`}>
                      {session.difficulty}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {session.content[0]}
                  </p>
                </div>
                
                <div className="flex-shrink-0">
                  {index === currentSessionIndex && !sessionInProgress && (
                    <Button size="sm" onClick={() => startSession(index)}>
                      Start
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      {currentPlan.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Insights for This Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentPlan.recommendations.map((rec, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <h4 className="font-medium text-sm text-foreground mb-1">{rec.title}</h4>
                  <p className="text-xs text-muted-foreground">{rec.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion */}
      {isCompleted && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">
                Study Plan Complete! 🎉
              </h3>
              <p className="text-muted-foreground mb-4">
                Great job completing your AI-optimized study session!
              </p>
              <Button onClick={() => setCurrentPlan(null)}>
                Generate New Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
