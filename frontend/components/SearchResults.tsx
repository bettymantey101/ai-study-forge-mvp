import React from 'react';
import { Link } from 'react-router-dom';
import { X, ExternalLink, FileText, BookOpen, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
  id: string;
  text: string;
  type: 'flashcard' | 'quiz' | 'section';
  studyPackId: string;
  studyPackName: string;
  score: number;
  metadata: any;
}

interface SearchResultsProps {
  result: SearchResult;
  onClose: () => void;
}

export default function SearchResults({ result, onClose }: SearchResultsProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'flashcard':
        return <BookOpen className="h-4 w-4" />;
      case 'quiz':
        return <Brain className="h-4 w-4" />;
      case 'section':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'flashcard':
        return 'bg-blue-100 text-blue-800';
      case 'quiz':
        return 'bg-green-100 text-green-800';
      case 'section':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTabForType = (type: string) => {
    switch (type) {
      case 'flashcard':
        return 'flashcards';
      case 'quiz':
        return 'quiz';
      case 'section':
        return 'mindmap';
      default:
        return 'flashcards';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <span>Search Result</span>
          <Badge variant="secondary" className={getTypeColor(result.type)}>
            {getTypeIcon(result.type)}
            <span className="ml-1 capitalize">{result.type}</span>
          </Badge>
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-foreground mb-2">
              From: {result.studyPackName}
            </h3>
            {result.metadata.sectionTitle && (
              <p className="text-sm text-muted-foreground mb-2">
                Section: {result.metadata.sectionTitle}
              </p>
            )}
            <p className="text-foreground leading-relaxed">
              {result.text}
            </p>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <span>Relevance: {Math.round(result.score * 100)}%</span>
              {result.metadata.difficulty && (
                <Badge variant="outline" className="text-xs">
                  {result.metadata.difficulty}
                </Badge>
              )}
            </div>
            <Link 
              to={`/study-pack/${result.studyPackId}?tab=${getTabForType(result.type)}`}
              onClick={onClose}
            >
              <Button size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                View in Study Pack
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
