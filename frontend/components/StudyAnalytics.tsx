import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Clock, Target, TrendingUp, Calendar, Zap, Award, Flame, BookOpen, Brain } from 'lucide-react';
import { AnalyticsService } from '../lib/analyticsService';
import type { StudyPack } from '../context/StudyPackContext';

interface StudyAnalyticsProps {
  studyPackId: string;
  studyPack: StudyPack;
}

export default function StudyAnalytics({ studyPackId, studyPack }: StudyAnalyticsProps) {
  const progress = AnalyticsService.getProgress(studyPackId);
  const sessions = AnalyticsService.getSessionsForStudyPack(studyPackId);
  const quizResults = AnalyticsService.getQuizResultsForStudyPack(studyPackId);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getAchievementIcon = (achievement: string) => {
    switch (achievement) {
      case 'consistent_learner': return <Calendar className="h-4 w-4" />;
      case 'week_warrior': return <Flame className="h-4 w-4" />;
      case 'accuracy_master': return <Target className="h-4 w-4" />;
      case 'time_champion': return <Clock className="h-4 w-4" />;
      default: return <Award className="h-4 w-4" />;
    }
  };

  const getAchievementName = (achievement: string) => {
    switch (achievement) {
      case 'consistent_learner': return 'Consistent Learner';
      case 'week_warrior': return 'Week Warrior';
      case 'accuracy_master': return 'Accuracy Master';
      case 'time_champion': return 'Time Champion';
      default: return achievement;
    }
  };

  const getAchievementDescription = (achievement: string) => {
    switch (achievement) {
      case 'consistent_learner': return 'Completed 5+ study sessions';
      case 'week_warrior': return 'Studied for 7 consecutive days';
      case 'accuracy_master': return 'Achieved 90%+ average accuracy';
      case 'time_champion': return 'Studied for over 1 hour total';
      default: return 'Special achievement unlocked';
    }
  };

  // Calculate session stats
  const sessionsByType = sessions.reduce((acc, session) => {
    acc[session.type] = (acc[session.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const completedSessions = sessions.filter(s => s.endTime);
  const averageSessionTime = completedSessions.length > 0 
    ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / completedSessions.length 
    : 0;

  // Quiz performance over time
  const recentQuizzes = quizResults.slice(-10);
  const accuracyTrend = recentQuizzes.length > 0 
    ? recentQuizzes.filter(r => r.isCorrect).length / recentQuizzes.length 
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">Study Analytics</h2>
        <p className="text-muted-foreground">
          Track your learning progress and identify areas for improvement
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Study Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTime(progress.totalStudyTime)}</div>
            <p className="text-xs text-muted-foreground">
              Across {progress.sessionsCount} sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Accuracy</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(progress.averageAccuracy * 100)}%</div>
            <p className="text-xs text-muted-foreground">
              Quiz performance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.streakDays}</div>
            <p className="text-xs text-muted-foreground">
              Consecutive days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Studied</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {progress.lastStudied.toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.floor((Date.now() - progress.lastStudied.getTime()) / (1000 * 60 * 60 * 24))} days ago
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Session Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Study Sessions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Flashcards</span>
                <Badge variant="secondary">{sessionsByType.flashcards || 0} sessions</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Quizzes</span>
                <Badge variant="secondary">{sessionsByType.quiz || 0} sessions</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Mind Maps</span>
                <Badge variant="secondary">{sessionsByType.mindmap || 0} sessions</Badge>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Average Session</span>
                  <span className="font-bold">{formatTime(averageSessionTime)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Quiz Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Recent Accuracy</span>
                  <span>{Math.round(accuracyTrend * 100)}%</span>
                </div>
                <Progress value={accuracyTrend * 100} />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Based on last {recentQuizzes.length} quiz attempts</p>
                <p className="mt-2">
                  Total Questions Answered: <span className="font-medium">{quizResults.length}</span>
                </p>
                <p>
                  Correct Answers: <span className="font-medium">{quizResults.filter(r => r.isCorrect).length}</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      {progress.achievements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5" />
              <span>Achievements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {progress.achievements.map((achievement) => (
                <div key={achievement} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <div className="text-yellow-500">
                    {getAchievementIcon(achievement)}
                  </div>
                  <div>
                    <h4 className="font-medium">{getAchievementName(achievement)}</h4>
                    <p className="text-sm text-muted-foreground">
                      {getAchievementDescription(achievement)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Study Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No study sessions yet. Start studying to see your progress!
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.slice(-5).reverse().map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {session.type === 'flashcards' && <BookOpen className="h-4 w-4" />}
                      {session.type === 'quiz' && <Brain className="h-4 w-4" />}
                      {session.type === 'mindmap' && <TrendingUp className="h-4 w-4" />}
                      <span className="font-medium capitalize">{session.type}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {session.startTime.toLocaleDateString()} at {session.startTime.toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    {session.duration && (
                      <Badge variant="outline">{formatTime(session.duration)}</Badge>
                    )}
                    {session.performance?.accuracy && (
                      <Badge variant="secondary">
                        {Math.round(session.performance.accuracy * 100)}% accuracy
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
