import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, RotateCcw, ChevronRight, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AnalyticsService, type QuizResult } from '../lib/analyticsService';
import type { QuizQuestion } from '../context/StudyPackContext';

interface QuizViewerProps {
  questions: QuizQuestion[];
  studyPackId: string;
}

export default function QuizViewer({ questions, studyPackId }: QuizViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState(30); // 30 seconds per question
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date());
  const [isPaused, setIsPaused] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout>();

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    // Start analytics session
    const id = AnalyticsService.startSession(studyPackId, 'quiz');
    setSessionId(id);
    
    return () => {
      // End session on unmount
      if (id) {
        const performance = calculatePerformance();
        AnalyticsService.endSession(id, performance);
      }
    };
  }, [studyPackId]);

  useEffect(() => {
    setSelectedAnswer(null);
    setShowResult(false);
    setTimeLeft(30);
    setQuestionStartTime(new Date());
    setIsPaused(false);
  }, [currentIndex]);

  useEffect(() => {
    if (!isPaused && timeLeft > 0 && !showResult) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !showResult) {
      // Time's up - auto-submit with no answer
      handleAnswerSelect(-1);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, isPaused, showResult]);

  if (!currentQuestion) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Quiz Questions Available
            </h3>
            <p className="text-muted-foreground">
              This study pack doesn't contain any quiz questions yet.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (showResult) return;
    
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    setIsPaused(true);
    
    const endTime = new Date();
    const timeSpent = Math.floor((endTime.getTime() - questionStartTime.getTime()) / 1000);
    const isCorrect = answerIndex === currentQuestion.correctAnswer;
    
    const result: QuizResult = {
      questionId: currentQuestion.id,
      selectedAnswer: answerIndex,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect,
      timeSpent,
      timestamp: endTime
    };
    
    // Record result in analytics
    AnalyticsService.recordQuizResult(studyPackId, result);
    
    setResults(prev => {
      const filtered = prev.filter(r => r.questionId !== currentQuestion.id);
      return [...filtered, result];
    });
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setQuizCompleted(true);
      // End analytics session
      const performance = calculatePerformance();
      AnalyticsService.endSession(sessionId, performance);
    }
  };

  const resetQuiz = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setResults([]);
    setQuizCompleted(false);
    setTimeLeft(30);
    setIsPaused(false);
    
    // Start new session
    const id = AnalyticsService.startSession(studyPackId, 'quiz');
    setSessionId(id);
  };

  const calculatePerformance = () => {
    if (results.length === 0) return undefined;
    
    const correctAnswers = results.filter(r => r.isCorrect).length;
    const averageTimePerQuestion = results.reduce((sum, r) => sum + r.timeSpent, 0) / results.length;
    
    return {
      totalQuestions: results.length,
      correctAnswers,
      accuracy: correctAnswers / results.length,
      averageTimePerQuestion
    };
  };

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const score = results.filter(r => r.isCorrect).length;
  const totalAnswered = results.length;

  const getTimerColor = () => {
    if (timeLeft > 20) return 'text-green-600';
    if (timeLeft > 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (quizCompleted) {
    const finalScore = (score / questions.length) * 100;
    const averageTime = results.reduce((sum, r) => sum + r.timeSpent, 0) / results.length;
    
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="mb-6">
              <div className="text-6xl font-bold text-primary mb-2">
                {Math.round(finalScore)}%
              </div>
              <p className="text-lg text-muted-foreground">
                You scored {score} out of {questions.length} questions correctly
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{score}</div>
                <div className="text-sm text-green-600">Correct</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{questions.length - score}</div>
                <div className="text-sm text-red-600">Incorrect</div>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{Math.round(averageTime)}s</div>
                <div className="text-sm text-blue-600">Avg. Time</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{questions.length}</div>
                <div className="text-sm text-purple-600">Total</div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Performance Analysis</h3>
              <div className="space-y-2">
                {finalScore >= 90 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <Zap className="h-3 w-3 mr-1" />
                    Excellent Performance!
                  </Badge>
                )}
                {averageTime < 15 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <Clock className="h-3 w-3 mr-1" />
                    Speed Demon!
                  </Badge>
                )}
                {score === questions.length && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    Perfect Score!
                  </Badge>
                )}
              </div>
            </div>

            <Button onClick={resetQuiz} size="lg">
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Timed Quiz</h2>
          <p className="text-muted-foreground">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 font-mono text-lg ${getTimerColor()}`}>
            <Clock className="h-5 w-5" />
            <span>{timeLeft}s</span>
          </div>
          <Badge variant="outline">
            Score: {score}/{totalAnswered}
          </Badge>
          <Button variant="outline" size="sm" onClick={resetQuiz}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Timer Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-1">
          <span>Time Remaining</span>
          <span>{timeLeft}s</span>
        </div>
        <Progress value={(timeLeft / 30) * 100} className="h-2" />
      </div>

      {/* Question */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">
            {currentQuestion.question}
          </h3>

          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              let buttonClass = "w-full p-4 text-left border border-border rounded-lg transition-colors hover:bg-muted";
              
              if (showResult) {
                if (index === currentQuestion.correctAnswer) {
                  buttonClass += " bg-green-50 border-green-300 text-green-800";
                } else if (index === selectedAnswer && index !== currentQuestion.correctAnswer) {
                  buttonClass += " bg-red-50 border-red-300 text-red-800";
                } else {
                  buttonClass += " opacity-60";
                }
              } else if (selectedAnswer === index) {
                buttonClass += " bg-primary/10 border-primary";
              }

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  className={buttonClass}
                  disabled={showResult}
                >
                  <div className="flex items-center justify-between">
                    <span>{option}</span>
                    {showResult && index === currentQuestion.correctAnswer && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {showResult && index === selectedAnswer && index !== currentQuestion.correctAnswer && (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {showResult && currentQuestion.explanation && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">Explanation</h4>
              <p className="text-muted-foreground">{currentQuestion.explanation}</p>
            </div>
          )}

          {showResult && selectedAnswer === -1 && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">Time's up! No answer was selected.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <div></div>
        <Button 
          onClick={nextQuestion}
          disabled={!showResult}
          size="lg"
        >
          {currentIndex < questions.length - 1 ? (
            <>
              Next Question
              <ChevronRight className="ml-2 h-4 w-4" />
            </>
          ) : (
            'Finish Quiz'
          )}
        </Button>
      </div>
    </div>
  );
}
