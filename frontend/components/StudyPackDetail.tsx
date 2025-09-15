import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Brain, GitBranch, BarChart3, FileText, Target, Repeat, Calendar, Scroll, Zap, Download, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudyPacks } from '../context/StudyPackContext';
import FlashcardViewer from './FlashcardViewer';
import QuizViewer from './QuizViewer';
import MindMapViewer from './MindMapViewer';
import StudyAnalytics from './StudyAnalytics';
import AdvancedAnalytics from './AdvancedAnalytics';
import SummaryViewer from './SummaryViewer';
import DragAndForgeViewer from './DragAndForgeViewer';
import SpacedRepetitionViewer from './SpacedRepetitionViewer';
import ForgeJournal from './ForgeJournal';
import DailyRecapScroll from './DailyRecapScroll';
import RecommendationPanel from './RecommendationPanel';
import StudyPlanGenerator from './StudyPlanGenerator';
import ExportImportModal from './ExportImportModal';

export default function StudyPackDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { getStudyPack } = useStudyPacks();
  const [activeTab, setActiveTab] = useState('flashcards');
  const [showRecap, setShowRecap] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);

  const studyPack = id ? getStudyPack(id) : undefined;

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  if (!studyPack) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Study Pack Not Found
          </h1>
          <Link to="/">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link to="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {studyPack.name}
            </h1>
            <p className="text-muted-foreground">
              {studyPack.fileName} • {studyPack.wordCount} words • Created {studyPack.createdAt.toLocaleDateString()}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setShowExportImport(true)}>
              <Download className="h-4 w-4 mr-2" />
              Export/Import
            </Button>
            <Button variant="outline" onClick={() => setShowRecap(true)}>
              <Scroll className="h-4 w-4 mr-2" />
              Daily Recap
            </Button>
          </div>
        </div>
      </div>

      {/* AI Recommendations Panel */}
      <div className="mb-8">
        <RecommendationPanel 
          studyPackId={studyPack.id}
          onRecommendationClick={(rec) => {
            // Handle recommendation clicks - could navigate to relevant tab
            if (rec.type === 'flashcard_review') {
              setActiveTab('spaced-repetition');
            } else if (rec.type === 'knowledge_gap') {
              setActiveTab('quiz');
            } else if (rec.type === 'study_plan') {
              setActiveTab('ai-plan');
            }
          }}
        />
      </div>

      {/* Study Modes */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-10">
          <TabsTrigger value="ai-plan" className="flex items-center space-x-2">
            <Zap className="h-4 w-4" />
            <span>AI Plan</span>
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>Cards</span>
          </TabsTrigger>
          <TabsTrigger value="spaced-repetition" className="flex items-center space-x-2">
            <Repeat className="h-4 w-4" />
            <span>Review</span>
          </TabsTrigger>
          <TabsTrigger value="quiz" className="flex items-center space-x-2">
            <Brain className="h-4 w-4" />
            <span>Quiz</span>
          </TabsTrigger>
          <TabsTrigger value="mindmap" className="flex items-center space-x-2">
            <GitBranch className="h-4 w-4" />
            <span>Mind Map</span>
          </TabsTrigger>
          <TabsTrigger value="summaries" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Summaries</span>
          </TabsTrigger>
          <TabsTrigger value="drag-forge" className="flex items-center space-x-2">
            <Target className="h-4 w-4" />
            <span>Forge</span>
          </TabsTrigger>
          <TabsTrigger value="journal" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Journal</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="advanced-analytics" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Advanced</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-plan" className="mt-6">
          <StudyPlanGenerator studyPackId={studyPack.id} />
        </TabsContent>

        <TabsContent value="flashcards" className="mt-6">
          <FlashcardViewer flashcards={studyPack.flashcards} studyPackId={studyPack.id} />
        </TabsContent>

        <TabsContent value="spaced-repetition" className="mt-6">
          <SpacedRepetitionViewer flashcards={studyPack.flashcards} studyPackId={studyPack.id} />
        </TabsContent>

        <TabsContent value="quiz" className="mt-6">
          <QuizViewer questions={studyPack.quizQuestions} studyPackId={studyPack.id} />
        </TabsContent>

        <TabsContent value="mindmap" className="mt-6">
          <MindMapViewer sections={studyPack.sections} />
        </TabsContent>

        <TabsContent value="summaries" className="mt-6">
          <SummaryViewer studyPack={studyPack} />
        </TabsContent>

        <TabsContent value="drag-forge" className="mt-6">
          <DragAndForgeViewer 
            flashcards={studyPack.flashcards} 
            quizQuestions={studyPack.quizQuestions}
            sections={studyPack.sections}
          />
        </TabsContent>

        <TabsContent value="journal" className="mt-6">
          <ForgeJournal studyPackId={studyPack.id} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <StudyAnalytics studyPackId={studyPack.id} studyPack={studyPack} />
        </TabsContent>

        <TabsContent value="advanced-analytics" className="mt-6">
          <AdvancedAnalytics studyPackId={studyPack.id} studyPack={studyPack} />
        </TabsContent>
      </Tabs>

      {/* Export/Import Modal */}
      <ExportImportModal 
        open={showExportImport} 
        onOpenChange={setShowExportImport}
      />

      {/* Daily Recap Modal */}
      <DailyRecapScroll 
        open={showRecap} 
        onOpenChange={setShowRecap}
        studyPackId={studyPack.id}
      />
    </div>
  );
}
