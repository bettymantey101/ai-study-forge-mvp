import React, { useState } from 'react';
import { Upload, FileText, BookOpen, Brain, Calendar, Scroll, Zap, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStudyPacks } from '../context/StudyPackContext';
import FileUpload from './FileUpload';
import StudyPackList from './StudyPackList';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import ForgeJournal from './ForgeJournal';
import DailyRecapScroll from './DailyRecapScroll';
import RecommendationPanel from './RecommendationPanel';
import ExportImportModal from './ExportImportModal';

export default function Dashboard() {
  const [showUpload, setShowUpload] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [showJournal, setShowJournal] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [showExportImport, setShowExportImport] = useState(false);
  const { studyPacks } = useStudyPacks();

  const handleSearchResultSelect = (result: any) => {
    setSearchResult(result);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          AI Study Forge
        </h1>
        <p className="text-muted-foreground text-lg">
          Transform your notes into interactive study materials
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-center space-y-2"
          onClick={() => setShowUpload(true)}
        >
          <Upload className="h-6 w-6" />
          <span>Upload Material</span>
        </Button>
        
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-center space-y-2"
          onClick={() => setShowJournal(true)}
        >
          <Calendar className="h-6 w-6" />
          <span>Forge Journal</span>
        </Button>
        
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-center space-y-2"
          onClick={() => setShowRecap(true)}
        >
          <Scroll className="h-6 w-6" />
          <span>Daily Recap</span>
        </Button>
        
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-center space-y-2"
          onClick={() => setShowExportImport(true)}
        >
          <Download className="h-6 w-6" />
          <span>Export/Import</span>
        </Button>
        
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-center space-y-2"
          disabled
        >
          <Brain className="h-6 w-6" />
          <span>AI Insights</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-center space-y-2"
          disabled
        >
          <Zap className="h-6 w-6" />
          <span>Smart Plans</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <SearchBar onResultSelect={handleSearchResultSelect} />
      </div>

      {/* Search Results */}
      {searchResult && (
        <div className="mb-8">
          <SearchResults result={searchResult} onClose={() => setSearchResult(null)} />
        </div>
      )}

      {/* Upload Section */}
      {showUpload && (
        <div className="mb-8">
          <FileUpload onClose={() => setShowUpload(false)} />
        </div>
      )}

      {/* Journal Section */}
      {showJournal && (
        <div className="mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Forge Journal</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowJournal(false)}>
                ×
              </Button>
            </CardHeader>
            <CardContent>
              <ForgeJournal />
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Recommendations - Only show if user has study packs */}
      {studyPacks.length > 0 && (
        <div className="mb-8">
          <RecommendationPanel 
            studyPackId={studyPacks[0].id} // Show recommendations for most recent study pack
            onRecommendationClick={(rec) => {
              // Could implement navigation logic here
              console.log('Recommendation clicked:', rec);
            }}
          />
        </div>
      )}

      {/* Stats Cards */}
      {studyPacks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Packs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{studyPacks.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Flashcards</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {studyPacks.reduce((sum, pack) => sum + pack.flashcards.length, 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quiz Questions</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {studyPacks.reduce((sum, pack) => sum + pack.quizQuestions.length, 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Study Packs List */}
      <StudyPackList />

      {/* Export/Import Modal */}
      <ExportImportModal 
        open={showExportImport} 
        onOpenChange={setShowExportImport}
      />

      {/* Daily Recap Modal */}
      <DailyRecapScroll 
        open={showRecap} 
        onOpenChange={setShowRecap}
      />
    </div>
  );
}
