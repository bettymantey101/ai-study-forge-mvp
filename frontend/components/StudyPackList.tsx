import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Calendar, BookOpen, Brain, Trash2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useStudyPacks } from '../context/StudyPackContext';
import { AnalyticsService } from '../lib/analyticsService';
import { EmbeddingService } from '../lib/embeddingService';
import { SpacedRepetitionService } from '../lib/spacedRepetitionService';
import { useToast } from '@/components/ui/use-toast';

export default function StudyPackList() {
  const { studyPacks, removeStudyPack } = useStudyPacks();
  const { toast } = useToast();

  const handleDelete = async (id: string, name: string) => {
    try {
      // Clean up embeddings
      await EmbeddingService.deleteEmbeddings(id);
      
      // Clean up analytics
      AnalyticsService.deleteProgress(id);
      
      // Clean up spaced repetition data
      SpacedRepetitionService.deleteData(id);
      
      // Remove from context
      removeStudyPack(id);
      
      toast({
        title: "Study pack deleted",
        description: `"${name}" and all associated data has been removed.`
      });
    } catch (error) {
      console.error('Failed to delete study pack:', error);
      toast({
        title: "Delete failed",
        description: "There was an error deleting the study pack. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (studyPacks.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No Study Packs Yet
            </h3>
            <p className="text-muted-foreground">
              Upload your first study material to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground mb-6">My Study Packs</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {studyPacks.map((pack) => {
          const progress = AnalyticsService.getProgress(pack.id);
          const sessions = AnalyticsService.getSessionsForStudyPack(pack.id);
          const dueCards = SpacedRepetitionService.getDueCards(pack.id, pack.flashcards);
          
          return (
            <Card key={pack.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight mb-1">
                      {pack.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{pack.fileName}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(pack.id, pack.name)}
                    className="ml-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Stats */}
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {pack.createdAt.toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      {pack.wordCount} words
                    </div>
                  </div>

                  {/* Due Cards Alert */}
                  {dueCards.length > 0 && (
                    <div className="flex items-center space-x-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="text-orange-600">🔔</div>
                      <span className="text-sm text-orange-800">
                        {dueCards.length} card{dueCards.length !== 1 ? 's' : ''} due for review
                      </span>
                    </div>
                  )}

                  {/* Progress */}
                  {progress.totalStudyTime > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Study Progress</span>
                        <span>{Math.round(progress.averageAccuracy * 100)}% accuracy</span>
                      </div>
                      <Progress value={progress.averageAccuracy * 100} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{sessions.length} sessions</span>
                        <span>{Math.floor(progress.totalStudyTime / 60)}m total</span>
                      </div>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <BookOpen className="h-3 w-3 mr-1" />
                      {pack.flashcards.length} cards
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Brain className="h-3 w-3 mr-1" />
                      {pack.quizQuestions.length} questions
                    </Badge>
                    {progress.streakDays > 0 && (
                      <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                        🔥 {progress.streakDays}d
                      </Badge>
                    )}
                  </div>

                  {/* Achievements */}
                  {progress.achievements.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <BarChart3 className="h-4 w-4 text-yellow-600" />
                      <span className="text-xs text-muted-foreground">
                        {progress.achievements.length} achievement{progress.achievements.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 space-y-2">
                    {dueCards.length > 0 && (
                      <Link to={`/study-pack/${pack.id}?tab=spaced-repetition`}>
                        <Button className="w-full" variant="default">
                          Review Due Cards ({dueCards.length})
                        </Button>
                      </Link>
                    )}
                    <Link to={`/study-pack/${pack.id}`}>
                      <Button className="w-full" variant={dueCards.length > 0 ? "outline" : "default"}>
                        {dueCards.length > 0 ? "Study Other Modes" : "Start Studying"}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
