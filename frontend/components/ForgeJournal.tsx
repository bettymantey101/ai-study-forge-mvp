import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Award, Calendar, Send, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { JournalService } from '../lib/journalService';
import { MockAIService } from '../lib/mockAiService';
import type { JournalEntry } from '../lib/journalService';

interface ForgeJournalProps {
  studyPackId?: string;
}

export default function ForgeJournal({ studyPackId }: ForgeJournalProps) {
  const [entry, setEntry] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishedEntry, setPolishedEntry] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [todayEntry, setTodayEntry] = useState<JournalEntry | null>(null);
  const [recentEntries, setRecentEntries] = useState<JournalEntry[]>([]);
  const [badges, setBadges] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadTodayEntry();
    loadRecentEntries();
    loadBadges();
  }, []);

  const loadTodayEntry = () => {
    const today = JournalService.getTodayEntry();
    setTodayEntry(today);
    if (today) {
      setEntry(today.originalText);
      setPolishedEntry(today.polishedText);
      setShowComparison(true);
    }
  };

  const loadRecentEntries = () => {
    const entries = JournalService.getRecentEntries(7);
    setRecentEntries(entries);
  };

  const loadBadges = () => {
    const userBadges = JournalService.getBadges();
    setBadges(userBadges);
  };

  const handlePolish = async () => {
    if (entry.trim().length < 10) {
      toast({
        title: "Entry too short",
        description: "Please write at least 10 characters for meaningful polishing.",
        variant: "destructive"
      });
      return;
    }

    setIsPolishing(true);
    try {
      const polished = await MockAIService.polishText(entry);
      setPolishedEntry(polished);
      setShowComparison(true);
    } catch (error) {
      console.error('Failed to polish text:', error);
      toast({
        title: "Polishing failed",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsPolishing(false);
    }
  };

  const handleSave = () => {
    if (!polishedEntry) return;

    const savedEntry = JournalService.saveEntry(entry, polishedEntry, studyPackId);
    setTodayEntry(savedEntry);
    loadRecentEntries();

    // Check for new badges
    const newBadges = JournalService.getBadges();
    const earnedNewBadge = newBadges.find(badge => !badges.includes(badge));
    
    if (earnedNewBadge) {
      setBadges(newBadges);
      toast({
        title: "Badge Earned! 🏆",
        description: `You've earned the "${earnedNewBadge}" badge!`,
      });
    } else {
      toast({
        title: "Entry saved!",
        description: "Your reflection has been added to your journal.",
      });
    }
  };

  const handleReset = () => {
    setEntry('');
    setPolishedEntry(null);
    setShowComparison(false);
  };

  const streak = JournalService.getStreak();
  const characterCount = entry.length;
  const wordCount = entry.trim() ? entry.trim().split(/\s+/).length : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center justify-center space-x-2">
          <BookOpen className="h-6 w-6" />
          <span>Forge Journal</span>
          <Sparkles className="h-5 w-5 text-yellow-500" />
        </h2>
        <p className="text-muted-foreground">
          Reflect on your learning journey and watch your writing improve with AI assistance
        </p>
      </div>

      {/* Stats & Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="text-center">
          <CardContent className="pt-4">
            <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl font-bold text-foreground">{streak}</div>
            <div className="text-sm text-muted-foreground">Day Streak</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-4">
            <BookOpen className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold text-foreground">{recentEntries.length}</div>
            <div className="text-sm text-muted-foreground">Journal Entries</div>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardContent className="pt-4">
            <Award className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <div className="text-2xl font-bold text-foreground">{badges.length}</div>
            <div className="text-sm text-muted-foreground">Badges Earned</div>
          </CardContent>
        </Card>
      </div>

      {/* Badges Display */}
      {badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5" />
              <span>Your Badges</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <Badge key={badge} variant="secondary" className="bg-yellow-100 text-yellow-800">
                  🏆 {badge}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Journal Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Today's Reflection</span>
            {todayEntry && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                ✓ Entry Saved
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showComparison ? (
            <>
              <div>
                <Textarea
                  placeholder="Write about your learning experience today... What did you discover? What challenged you? How do you feel about your progress?"
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                  className="min-h-[120px] resize-none"
                  disabled={isPolishing}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>{characterCount} characters</span>
                  <span>{wordCount} words</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  onClick={handlePolish} 
                  disabled={entry.trim().length < 10 || isPolishing}
                  className="flex-1"
                >
                  {isPolishing ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Polishing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Polish with AI
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {/* Before & After Comparison */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-foreground mb-2 flex items-center">
                    <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                    Before (Original)
                  </h4>
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-foreground">{entry}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground mb-2 flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    After (AI Polished)
                  </h4>
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-foreground">{polishedEntry}</p>
                  </div>
                </div>
              </div>

              {/* Improvement Highlights */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 mb-2">✨ AI Improvements</h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Enhanced grammar and sentence structure</li>
                  <li>• Improved clarity and flow</li>
                  <li>• Refined vocabulary choices</li>
                  <li>• Better emotional expression</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                {!todayEntry && (
                  <Button onClick={handleSave} className="flex-1">
                    <Send className="h-4 w-4 mr-2" />
                    Save Polished Entry
                  </Button>
                )}
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Write New Entry
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Entries */}
      {recentEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Reflections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentEntries.slice(0, 3).map((entry) => (
                <div key={entry.id} className="border border-border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium text-foreground">
                      {entry.date.toLocaleDateString()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {entry.wordCount} words
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {entry.polishedText}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
