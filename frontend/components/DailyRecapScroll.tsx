import React, { useState, useEffect } from 'react';
import { Scroll, Sparkles, Calendar, TrendingUp, BookOpen, Brain, Flame, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { JournalService } from '../lib/journalService';
import { AnalyticsService } from '../lib/analyticsService';
import { MockAIService } from '../lib/mockAiService';
import { RecapService } from '../lib/recapService';
import type { DailyRecap } from '../lib/recapService';

interface DailyRecapScrollProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studyPackId?: string;
}

export default function DailyRecapScroll({ open, onOpenChange, studyPackId }: DailyRecapScrollProps) {
  const [recap, setRecap] = useState<DailyRecap | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFullScroll, setShowFullScroll] = useState(false);

  useEffect(() => {
    if (open) {
      generateRecap();
    }
  }, [open, studyPackId]);

  const generateRecap = async () => {
    setIsGenerating(true);
    try {
      const todayRecap = await RecapService.generateDailyRecap(studyPackId);
      setRecap(todayRecap);
      setTimeout(() => setShowFullScroll(true), 500);
    } catch (error) {
      console.error('Failed to generate recap:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setShowFullScroll(false);
    setTimeout(() => {
      onOpenChange(false);
      setRecap(null);
    }, 300);
  };

  const getStreakEncouragement = (streak: number) => {
    if (streak === 0) return "Start your learning journey today! 🌱";
    if (streak === 1) return "Great start! Keep the momentum going! 🚀";
    if (streak < 7) return `${streak} days strong! You're building a habit! 💪`;
    if (streak < 30) return `${streak} days! You're on fire! 🔥`;
    return `${streak} days! You're a learning legend! 👑`;
  };

  const getMotivationalMessage = (studiedToday: boolean, streak: number) => {
    if (!studiedToday) {
      return "There's still time to study today and continue your streak! 📚";
    }
    return `Tomorrow is day ${streak + 1}! Ready to forge ahead? ⚒️`;
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        <div className="relative">
          {/* Scroll Background */}
          <div className="bg-gradient-to-b from-amber-50 to-amber-100 min-h-[600px] p-6 relative overflow-hidden">
            {/* Decorative Scroll Edges */}
            <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-amber-200 to-amber-100 rounded-t-lg"></div>
            <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-amber-200 to-amber-100 rounded-b-lg"></div>
            
            {/* Close Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="absolute top-2 right-2 z-10"
            >
              <X className="h-4 w-4" />
            </Button>

            <div className={`transition-all duration-700 ${showFullScroll ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center space-x-2 mb-4">
                  <Scroll className="h-8 w-8 text-amber-700" />
                  <h2 className="text-2xl font-bold text-amber-900">Daily Forge Scroll</h2>
                  <Sparkles className="h-6 w-6 text-yellow-500" />
                </div>
                <p className="text-amber-700">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>

              {isGenerating ? (
                <div className="text-center py-12">
                  <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-amber-700">Forging your daily recap...</p>
                </div>
              ) : recap ? (
                <div className="space-y-6">
                  {/* AI Summary */}
                  {recap.aiSummary && (
                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-amber-200">
                      <h3 className="font-semibold text-amber-900 mb-3 flex items-center">
                        <Brain className="h-5 w-5 mr-2" />
                        Today's Learning Journey
                      </h3>
                      <p className="text-amber-800 leading-relaxed italic">
                        "{recap.aiSummary}"
                      </p>
                    </div>
                  )}

                  {/* Streak Progress */}
                  <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-amber-200">
                    <h3 className="font-semibold text-amber-900 mb-3 flex items-center">
                      <Flame className="h-5 w-5 mr-2" />
                      Forge Streak Progress
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-amber-800">Current Streak</span>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          🔥 {recap.streakDays} days
                        </Badge>
                      </div>
                      <div>
                        <Progress value={Math.min((recap.streakDays % 7 + 1) / 7 * 100, 100)} className="h-3" />
                        <p className="text-xs text-amber-700 mt-1">
                          {getStreakEncouragement(recap.streakDays)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Study Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-amber-200 text-center">
                      <BookOpen className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                      <div className="text-2xl font-bold text-amber-900">{recap.flashcardsReviewed}</div>
                      <div className="text-sm text-amber-700">Cards Reviewed</div>
                    </div>
                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-amber-200 text-center">
                      <Brain className="h-6 w-6 mx-auto mb-2 text-green-600" />
                      <div className="text-2xl font-bold text-amber-900">{recap.quizQuestions}</div>
                      <div className="text-sm text-amber-700">Quiz Questions</div>
                    </div>
                  </div>

                  {/* Journal Reflection */}
                  {recap.journalEntry && (
                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-amber-200">
                      <h3 className="font-semibold text-amber-900 mb-3 flex items-center">
                        <Calendar className="h-5 w-5 mr-2" />
                        Today's Reflection
                      </h3>
                      <div className="bg-amber-50 rounded p-3 border-l-4 border-amber-400">
                        <p className="text-amber-800 italic">
                          "{recap.journalEntry.polishedText}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Topics Studied */}
                  {recap.topicsStudied.length > 0 && (
                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-amber-200">
                      <h3 className="font-semibold text-amber-900 mb-3 flex items-center">
                        <TrendingUp className="h-5 w-5 mr-2" />
                        Topics Explored
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {recap.topicsStudied.map((topic, index) => (
                          <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Achievements */}
                  {recap.badges.length > 0 && (
                    <div className="bg-white/70 backdrop-blur-sm rounded-lg p-4 border border-amber-200">
                      <h3 className="font-semibold text-amber-900 mb-3 flex items-center">
                        <Sparkles className="h-5 w-5 mr-2" />
                        Today's Achievements
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {recap.badges.map((badge, index) => (
                          <Badge key={index} variant="secondary" className="bg-yellow-100 text-yellow-800">
                            🏆 {badge}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Motivational Footer */}
                  <div className="bg-gradient-to-r from-amber-200 to-orange-200 rounded-lg p-4 border border-amber-300 text-center">
                    <h3 className="font-semibold text-amber-900 mb-2">Tomorrow Awaits!</h3>
                    <p className="text-amber-800 mb-3">
                      {getMotivationalMessage(recap.studiedToday, recap.streakDays)}
                    </p>
                    <div className="flex items-center justify-center space-x-2 text-amber-700">
                      <span>Ready to forge ahead?</span>
                      <ChevronRight className="h-4 w-4" />
                      <span>⚒️</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-amber-700">No study activity found for today.</p>
                  <p className="text-amber-600 text-sm mt-2">Start studying to see your daily recap!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
