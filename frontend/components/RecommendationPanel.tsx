import React, { useState, useEffect } from 'react';
import { Lightbulb, Clock, AlertTriangle, TrendingUp, Calendar, CheckCircle, ArrowRight, Zap, Target, Coffee } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RecommendationService, type StudyRecommendation } from '../lib/recommendationService';

interface RecommendationPanelProps {
  studyPackId: string;
  onRecommendationClick?: (recommendation: StudyRecommendation) => void;
}

export default function RecommendationPanel({ studyPackId, onRecommendationClick }: RecommendationPanelProps) {
  const [recommendations, setRecommendations] = useState<StudyRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRec, setExpandedRec] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendations();
  }, [studyPackId]);

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      const recs = await RecommendationService.generateRecommendations(studyPackId);
      setRecommendations(recs);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'flashcard_review':
        return <TrendingUp className="h-4 w-4" />;
      case 'break_time':
        return <Coffee className="h-4 w-4" />;
      case 'knowledge_gap':
        return <AlertTriangle className="h-4 w-4" />;
      case 'study_plan':
        return <Calendar className="h-4 w-4" />;
      case 'focus_area':
        return <Target className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleRecommendationClick = (recommendation: StudyRecommendation) => {
    if (expandedRec === recommendation.title) {
      setExpandedRec(null);
    } else {
      setExpandedRec(recommendation.title);
    }
    onRecommendationClick?.(recommendation);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span>AI Study Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Analyzing your study patterns...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span>AI Study Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Great Work!</h3>
            <p className="text-muted-foreground">
              No immediate recommendations. Keep up your consistent study habits!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span>AI Study Recommendations</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {recommendations.length} insights
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.slice(0, 5).map((recommendation, index) => (
            <div
              key={`${recommendation.type}-${index}`}
              className="border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleRecommendationClick(recommendation)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between space-x-3">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="text-muted-foreground mt-1">
                      {getTypeIcon(recommendation.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-foreground text-sm">
                          {recommendation.title}
                        </h4>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${getPriorityColor(recommendation.priority)}`}
                        >
                          {recommendation.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {recommendation.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        {recommendation.estimatedTime && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{recommendation.estimatedTime}m</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <span>Confidence:</span>
                          <span className="font-medium">
                            {Math.round(recommendation.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className={`h-4 w-4 text-muted-foreground transition-transform ${
                    expandedRec === recommendation.title ? 'rotate-90' : ''
                  }`} />
                </div>

                {expandedRec === recommendation.title && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="space-y-3">
                      <div>
                        <h5 className="text-sm font-medium text-foreground mb-2">Action Items:</h5>
                        <ul className="space-y-1">
                          {recommendation.actionItems.map((item, itemIndex) => (
                            <li key={itemIndex} className="text-sm text-muted-foreground flex items-start space-x-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-medium text-foreground mb-1">Why this matters:</h5>
                        <p className="text-sm text-muted-foreground italic">
                          {recommendation.reasoning}
                        </p>
                      </div>

                      {recommendation.topicAreas && recommendation.topicAreas.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-foreground mb-2">Focus Areas:</h5>
                          <div className="flex flex-wrap gap-1">
                            {recommendation.topicAreas.map((topic, topicIndex) => (
                              <Badge key={topicIndex} variant="outline" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <Button size="sm" className="flex-1">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Apply Suggestion
                        </Button>
                        <Button size="sm" variant="outline">
                          Not Now
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {recommendations.length > 5 && (
            <div className="text-center pt-2">
              <Button variant="outline" size="sm" onClick={loadRecommendations}>
                View All {recommendations.length} Recommendations
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
