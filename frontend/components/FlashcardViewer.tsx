import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AnalyticsService } from '../lib/analyticsService';
import type { Flashcard } from '../context/StudyPackContext';

interface FlashcardViewerProps {
  flashcards: Flashcard[];
  studyPackId: string;
}

export default function FlashcardViewer({ flashcards, studyPackId }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [shuffledCards, setShuffledCards] = useState<Flashcard[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [cardStartTime, setCardStartTime] = useState<Date>(new Date());
  const [flipTimes, setFlipTimes] = useState<number[]>([]);
  const [reviewedCards, setReviewedCards] = useState<Set<number>>(new Set());
  const [difficultCards, setDifficultCards] = useState<Set<number>>(new Set());

  useEffect(() => {
    setShuffledCards([...flashcards]);
    
    // Start analytics session
    const id = AnalyticsService.startSession(studyPackId, 'flashcards');
    setSessionId(id);
    
    return () => {
      // End session on unmount
      if (id) {
        const flashcardStats = {
          cardsReviewed: reviewedCards.size,
          cardsMarkedDifficult: Array.from(difficultCards),
          averageFlipTime: flipTimes.length > 0 ? flipTimes.reduce((sum, time) => sum + time, 0) / flipTimes.length : 0
        };
        AnalyticsService.endSession(id, undefined, flashcardStats);
      }
    };
  }, [flashcards, studyPackId]);

  const currentCard = shuffledCards[currentIndex];

  if (!currentCard) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Flashcards Available
            </h3>
            <p className="text-muted-foreground">
              This study pack doesn't contain any flashcards yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % shuffledCards.length);
    setShowAnswer(false);
    setCardStartTime(new Date());
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + shuffledCards.length) % shuffledCards.length);
    setShowAnswer(false);
    setCardStartTime(new Date());
  };

  const shuffleCards = () => {
    const shuffled = [...shuffledCards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setCurrentIndex(0);
    setShowAnswer(false);
    setCardStartTime(new Date());
  };

  const resetCards = () => {
    setShuffledCards([...flashcards]);
    setCurrentIndex(0);
    setShowAnswer(false);
    setReviewedCards(new Set());
    setDifficultCards(new Set());
    setFlipTimes([]);
    setCardStartTime(new Date());
  };

  const flipCard = () => {
    if (!showAnswer) {
      const flipTime = Date.now() - cardStartTime.getTime();
      setFlipTimes(prev => [...prev, flipTime / 1000]);
      setReviewedCards(prev => new Set([...prev, currentIndex]));
    }
    setShowAnswer(!showAnswer);
  };

  const markDifficult = () => {
    setDifficultCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentIndex)) {
        newSet.delete(currentIndex);
      } else {
        newSet.add(currentIndex);
      }
      return newSet;
    });
  };

  const progress = ((currentIndex + 1) / shuffledCards.length) * 100;
  const reviewProgress = (reviewedCards.size / shuffledCards.length) * 100;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Flashcards</h2>
          <p className="text-muted-foreground">
            Card {currentIndex + 1} of {shuffledCards.length}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={shuffleCards}>
            <Shuffle className="h-4 w-4 mr-2" />
            Shuffle
          </Button>
          <Button variant="outline" size="sm" onClick={resetCards}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-4 mb-6">
        <div>
          <div className="flex justify-between text-sm text-muted-foreground mb-1">
            <span>Current Position</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>
        <div>
          <div className="flex justify-between text-sm text-muted-foreground mb-1">
            <span>Cards Reviewed</span>
            <span>{reviewedCards.size}/{shuffledCards.length}</span>
          </div>
          <Progress value={reviewProgress} className="bg-green-100" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-3">
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{reviewedCards.size}</div>
            <div className="text-xs text-muted-foreground">Reviewed</div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">{difficultCards.size}</div>
            <div className="text-xs text-muted-foreground">Difficult</div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {flipTimes.length > 0 ? Math.round(flipTimes.reduce((sum, time) => sum + time, 0) / flipTimes.length) : 0}s
            </div>
            <div className="text-xs text-muted-foreground">Avg. Time</div>
          </div>
        </Card>
      </div>

      {/* Flashcard */}
      <Card className="min-h-[400px] cursor-pointer" onClick={flipCard}>
        <CardContent className="p-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex space-x-2">
              <Badge 
                variant="secondary" 
                className={`text-white ${getDifficultyColor(currentCard.difficulty)}`}
              >
                {currentCard.difficulty}
              </Badge>
              {difficultCards.has(currentIndex) && (
                <Badge variant="destructive">Marked Difficult</Badge>
              )}
              {reviewedCards.has(currentIndex) && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Reviewed
                </Badge>
              )}
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

      {/* Controls */}
      <div className="flex items-center justify-between mt-6">
        <Button 
          variant="outline" 
          onClick={prevCard}
          disabled={shuffledCards.length <= 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex space-x-2">
          <Button
            variant={showAnswer ? "default" : "outline"}
            onClick={flipCard}
          >
            {showAnswer ? 'Show Question' : 'Show Answer'}
          </Button>
          <Button
            variant={difficultCards.has(currentIndex) ? "destructive" : "outline"}
            onClick={markDifficult}
          >
            {difficultCards.has(currentIndex) ? 'Remove Mark' : 'Mark Difficult'}
          </Button>
        </div>

        <Button 
          variant="outline" 
          onClick={nextCard}
          disabled={shuffledCards.length <= 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* Keyboard Instructions */}
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground text-center">
          Use <kbd className="px-2 py-1 bg-background rounded text-xs">←</kbd> and{' '}
          <kbd className="px-2 py-1 bg-background rounded text-xs">→</kbd> arrow keys to navigate, or{' '}
          <kbd className="px-2 py-1 bg-background rounded text-xs">Space</kbd> to flip cards
        </p>
      </div>
    </div>
  );
}
