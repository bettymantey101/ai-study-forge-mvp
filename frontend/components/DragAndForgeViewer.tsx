import React, { useState, useCallback } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CheckCircle, XCircle, RotateCcw, Shuffle, GripVertical, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Flashcard, QuizQuestion, ParsedSection } from '../context/StudyPackContext';

interface DragAndForgeViewerProps {
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
  sections: ParsedSection[];
}

interface SortableItem {
  id: string;
  content: string;
  type: 'flashcard' | 'section' | 'timeline';
  originalIndex: number;
  difficulty?: string;
}

function SortableCard({ item, isCorrect }: { item: SortableItem; isCorrect?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        p-4 border rounded-lg cursor-move transition-all
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
        ${isCorrect === true ? 'border-green-500 bg-green-50' : ''}
        ${isCorrect === false ? 'border-red-500 bg-red-50' : ''}
        ${isCorrect === undefined ? 'border-border bg-background hover:bg-muted' : ''}
      `}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start space-x-3">
        <GripVertical className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <Badge variant="outline" className="text-xs">
              {item.type}
            </Badge>
            {item.difficulty && (
              <Badge variant="secondary" className="text-xs">
                {item.difficulty}
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            {item.content}
          </p>
        </div>
        {isCorrect !== undefined && (
          <div className="flex-shrink-0">
            {isCorrect ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DragAndForgeViewer({ flashcards, quizQuestions, sections }: DragAndForgeViewerProps) {
  const [gameMode, setGameMode] = useState<'flashcards' | 'timeline' | 'concepts'>('flashcards');
  const [items, setItems] = useState<SortableItem[]>([]);
  const [originalOrder, setOriginalOrder] = useState<SortableItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const initializeGame = useCallback((mode: 'flashcards' | 'timeline' | 'concepts') => {
    let gameItems: SortableItem[] = [];

    switch (mode) {
      case 'flashcards':
        gameItems = flashcards.slice(0, 6).map((card, index) => ({
          id: card.id,
          content: card.question,
          type: 'flashcard',
          originalIndex: index,
          difficulty: card.difficulty
        }));
        break;
      
      case 'timeline':
        const timelineItems = sections.slice(0, 5).map((section, index) => ({
          id: `section_${index}`,
          content: section.title,
          type: 'timeline' as const,
          originalIndex: index
        }));
        gameItems = timelineItems;
        break;
      
      case 'concepts':
        const concepts = sections.slice(0, 4).map((section, index) => ({
          id: `concept_${index}`,
          content: section.title,
          type: 'section' as const,
          originalIndex: index
        }));
        gameItems = concepts;
        break;
    }

    const shuffled = [...gameItems].sort(() => Math.random() - 0.5);
    setOriginalOrder(gameItems);
    setItems(shuffled);
    setShowResults(false);
    setScore(0);
    setGameMode(mode);
  }, [flashcards, sections]);

  React.useEffect(() => {
    if (flashcards.length > 0) {
      initializeGame('flashcards');
    }
  }, [flashcards, initializeGame]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const checkAnswer = () => {
    let correctCount = 0;
    for (let i = 0; i < items.length; i++) {
      if (items[i].originalIndex === originalOrder[i].originalIndex) {
        correctCount++;
      }
    }
    setScore(correctCount);
    setShowResults(true);
  };

  const shuffleItems = () => {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    setItems(shuffled);
    setShowResults(false);
  };

  const resetGame = () => {
    initializeGame(gameMode);
  };

  const getItemCorrectness = (item: SortableItem, index: number) => {
    if (!showResults) return undefined;
    return item.originalIndex === originalOrder[index].originalIndex;
  };

  const accuracy = items.length > 0 ? (score / items.length) * 100 : 0;

  const getInstructions = () => {
    switch (gameMode) {
      case 'flashcards':
        return 'Drag the flashcard questions to arrange them by difficulty level (easiest to hardest)';
      case 'timeline':
        return 'Arrange these sections in the order they appear in the study material';
      case 'concepts':
        return 'Order these concepts from most fundamental to most advanced';
      default:
        return 'Drag and drop items to arrange them in the correct order';
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Content Available
              </h3>
              <p className="text-muted-foreground">
                This study pack doesn't have enough content for Drag and Forge mode.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Drag & Forge Mode</h2>
        <p className="text-muted-foreground mb-4">
          {getInstructions()}
        </p>
        
        {/* Game Mode Selector */}
        <div className="flex space-x-2 mb-4">
          <Button
            variant={gameMode === 'flashcards' ? 'default' : 'outline'}
            size="sm"
            onClick={() => initializeGame('flashcards')}
            disabled={flashcards.length < 3}
          >
            Flashcards
          </Button>
          <Button
            variant={gameMode === 'timeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => initializeGame('timeline')}
            disabled={sections.length < 3}
          >
            Timeline
          </Button>
          <Button
            variant={gameMode === 'concepts' ? 'default' : 'outline'}
            size="sm"
            onClick={() => initializeGame('concepts')}
            disabled={sections.length < 3}
          >
            Concepts
          </Button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={shuffleItems} disabled={showResults}>
              <Shuffle className="h-4 w-4 mr-2" />
              Shuffle
            </Button>
            <Button variant="outline" size="sm" onClick={resetGame}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
          
          <Button onClick={checkAnswer} disabled={showResults}>
            <Target className="h-4 w-4 mr-2" />
            Check Order
          </Button>
        </div>
      </div>

      {/* Results */}
      {showResults && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Results</span>
              <Badge variant={accuracy >= 80 ? 'default' : accuracy >= 60 ? 'secondary' : 'destructive'}>
                {score}/{items.length} correct
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Accuracy</span>
                  <span>{Math.round(accuracy)}%</span>
                </div>
                <Progress value={accuracy} />
              </div>
              
              {accuracy === 100 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">Perfect! You got the order exactly right!</span>
                  </div>
                </div>
              )}
              
              {accuracy >= 80 && accuracy < 100 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-800">Great job! You're almost there!</span>
                  </div>
                </div>
              )}
              
              {accuracy < 80 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Keep practicing! Try reviewing the material again.</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drag and Drop Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <GripVertical className="h-5 w-5" />
            <span>Drag items to reorder them</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <SortableCard
                    key={item.id}
                    item={item}
                    isCorrect={getItemCorrectness(item, index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground text-center">
          💡 Tip: Click and drag the grip handle (⋮⋮) to reorder items. The goal is to arrange them in the correct sequence!
        </p>
      </div>
    </div>
  );
}
