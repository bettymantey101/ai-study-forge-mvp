import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Brain, TrendingUp, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SpacedRepetitionService } from '../lib/spacedRepetitionService';
import type { Flashcard } from '../context/StudyPackContext';

interface SpacedRepetitionViewerProps {
  flashcards: Flashcard[];
  studyPackId: string;
}

export default function SpacedRepetitionViewer({ flashcards, studyPackId }: SpacedRepetitionViewerProps) {
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [todayStats, setTodayStats] = useState<any>(null);
  const [sessionComplete, setSessionComplete] = useState(false);

  useEffect(() => {
    loadDueCards();
    loadTodayStats();
  }, [flashcards, studyPackId]);

  const loadDueCards = () => {
    const due = SpacedRepetitionService.getDueCards(studyPackId, flashcards);
    setDueCards(due);
    setCurrentCard(due[0] || null);
    setShowAnswer(false);
    setSessionComplete(due.length === 0);
  };

  const loadTodayStats = () => {
    const stats = SpacedRepetitionService.getTodayStats(studyPackId);
    setTodayStats(stats);
  };

  const handleAnswer = (quality: number) => {
    if (!currentCard) return;

    SpacedRepetitionService.recordReview(studyPackId, currentCard.id, quality);
    
    const remainingCards = dueCards.slice(1);
    setDueCards(remainingCards);
    setCurrentCard(remainingCards[0] || null);
    setShowAnswer(false);
    
    if (remainingCards.length === 0) {
      setSessionComplete(true);
    }

    loadTodayStats();
  };

  const resetSession = () => {
    loadDueCards();
    setSessionComplete(false);
  };

  const formatTimeUntilNext = (nextReview: Date) => {
    const now = new Date();
    const diff = nextReview.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h`;
    return 'Soon';
  };

  if (sessionComplete) {
    const upcomingCards = SpacedRepetitionService.getUpcomingCards(studyPackId, flashcards, 5);
    
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <span>Session Complete!</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-6">
              <p className="text-lg text-muted-foreground">
                Great work! You've reviewed all cards due today.
              </p>

              {todayStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{todayStats.reviewed}</div>
                    <div className="text-sm text-green-600">Reviewed</div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{todayStats.learned}</div>
                    <div className="text-sm text-blue-600">Learned</div>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{Math.round(todayStats.accuracy * 100)}%</div>
                    <div className="text-sm text-yellow-600">Accuracy</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{todayStats.streak}</div>
                    <div className="text-sm text-purple-600">Day Streak</div>
                  </div>
                </div>
              )}

              {upcomingCards.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Next Review Schedule</h3>
                  <div className="space-y-2">
                    {upcomingCards.map((card) => (
                      <div key={card.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="text-sm text-foreground">{card.question.substring(0, 50)}...</span>
                        <Badge variant="outline">
                          {formatTimeUntilNext(card.nextReview)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-4 justify-center">
                <Button onClick={resetSession}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Practice More
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Cards Due
              </h3>
              <p className="text-muted-foreground mb-4">
                All your flashcards are scheduled for future review. Come back later!
              </p>
              <Button onClick={resetSession}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Practice Anyway
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = dueCards.length > 0 ? ((flashcards.length - dueCards.length) / flashcards.length) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Spaced Repetition</h2>
        <p className="text-muted-foreground">
          Review cards at optimal intervals to maximize retention
        </p>
      </div>

      {/* Stats */}
      {todayStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{dueCards.length}</div>
              <div className="text-xs text-muted-foreground">Due Today</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{todayStats.reviewed}</div>
              <div className="text-xs text-muted-foreground">Reviewed</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{Math.round(todayStats.accuracy * 100)}%</div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{todayStats.streak}</div>
              <div className="text-xs text-muted-foreground">Day Streak</div>
            </div>
          </Card>
        </div>
      )}

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Session Progress</span>
          <span>{flashcards.length - dueCards.length}/{flashcards.length}</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Current Card */}
      <Card className="min-h-[400px] cursor-pointer" onClick={() => setShowAnswer(!showAnswer)}>
        <CardContent className="p-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex space-x-2">
              <Badge variant="secondary" className={`text-white ${
                currentCard.difficulty === 'easy' ? 'bg-green-500' :
                currentCard.difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
              }`}>
                {currentCard.difficulty}
              </Badge>
            </div>
            <Badge variant="outline">
              {showAnswer ? 'Answer' : 'Question'}
            </Badge>
          </div>

          <div className="min-h-[280px] flex items-center justify-center">
            <div className="text-center">
              <p className="text-lg leading-relaxed text-foreground">
                {showAnswer ? currentCard.answer : currentCard.question}
              </p>
              
              {!showAnswer && (
                <p className="text-sm text-muted-foreground mt-4">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Click to reveal answer
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Answer Buttons */}
      {showAnswer && (
        <div className="mt-6 grid grid-cols-4 gap-2">
          <Button
            variant="destructive"
            onClick={() => handleAnswer(1)}
            className="flex flex-col items-center p-4 h-auto"
          >
            <XCircle className="h-5 w-5 mb-2" />
            <span className="text-xs">Again</span>
            <span className="text-xs opacity-75">&lt; 1 min</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAnswer(2)}
            className="flex flex-col items-center p-4 h-auto border-red-300 text-red-700 hover:bg-red-50"
          >
            <XCircle className="h-5 w-5 mb-2" />
            <span className="text-xs">Hard</span>
            <span className="text-xs opacity-75">6 min</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => handleAnswer(3)}
            className="flex flex-col items-center p-4 h-auto border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <CheckCircle className="h-5 w-5 mb-2" />
            <span className="text-xs">Good</span>
            <span className="text-xs opacity-75">1 day</span>
          </Button>
          <Button
            variant="default"
            onClick={() => handleAnswer(4)}
            className="flex flex-col items-center p-4 h-auto bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-5 w-5 mb-2" />
            <span className="text-xs">Easy</span>
            <span className="text-xs opacity-75">4 days</span>
          </Button>
        </div>
      )}

      {/* Instructions */}
      {showAnswer && (
        <div className="mt-4 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            Rate how well you remembered this card. This helps optimize your review schedule.
          </p>
        </div>
      )}
    </div>
  );
}
