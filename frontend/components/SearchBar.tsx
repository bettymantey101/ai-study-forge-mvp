import React, { useState, useEffect } from 'react';
import { Search, X, FileText, BookOpen, Brain } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStudyPacks } from '../context/StudyPackContext';
import { EmbeddingService } from '../lib/embeddingService';
import { SearchService } from '../lib/searchService';

interface SearchResult {
  id: string;
  text: string;
  type: 'flashcard' | 'quiz' | 'section';
  studyPackId: string;
  studyPackName: string;
  score: number;
  metadata: any;
}

interface SearchBarProps {
  onResultSelect?: (result: SearchResult) => void;
}

export default function SearchBar({ onResultSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { studyPacks } = useStudyPacks();

  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.trim().length > 2) {
        await performSearch(query);
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, studyPacks]);

  const performSearch = async (searchQuery: string) => {
    setIsSearching(true);
    try {
      const searchResults = await SearchService.search(searchQuery, studyPacks);
      setResults(searchResults);
      setShowResults(true);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onResultSelect?.(result);
    setShowResults(false);
    setQuery('');
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'flashcard':
        return <BookOpen className="h-4 w-4" />;
      case 'quiz':
        return <Brain className="h-4 w-4" />;
      case 'section':
        return <FileText className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
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

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search across all your study materials..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showResults && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 overflow-y-auto">
          <CardContent className="p-0">
            {isSearching ? (
              <div className="p-4 text-center text-muted-foreground">
                Searching...
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No results found for "{query}"
              </div>
            ) : (
              <div className="divide-y">
                {results.map((result, index) => (
                  <div
                    key={`${result.studyPackId}-${result.id}-${index}`}
                    className="p-3 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex items-start justify-between space-x-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant="secondary" className={getTypeColor(result.type)}>
                            {getTypeIcon(result.type)}
                            <span className="ml-1 capitalize">{result.type}</span>
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {result.studyPackName}
                          </span>
                        </div>
                        <p className="text-sm text-foreground line-clamp-2">
                          {result.text}
                        </p>
                        {result.metadata.sectionTitle && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Section: {result.metadata.sectionTitle}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(result.score * 100)}% match
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
