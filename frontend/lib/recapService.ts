import { JournalService, type JournalEntry } from './journalService';
import { AnalyticsService } from './analyticsService';
import { MockAIService } from './mockAiService';

export interface DailyRecap {
  date: Date;
  studyPackId?: string;
  aiSummary: string;
  flashcardsReviewed: number;
  quizQuestions: number;
  studyTime: number;
  topicsStudied: string[];
  journalEntry?: JournalEntry;
  streakDays: number;
  badges: string[];
  studiedToday: boolean;
}

export class RecapService {
  private static readonly RECAPS_KEY = 'studyForge_daily_recaps';

  static async generateDailyRecap(studyPackId?: string): Promise<DailyRecap> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's data
    const journalEntry = JournalService.getTodayEntry();
    const journalStreak = JournalService.getStreak();
    const journalBadges = JournalService.getBadges();

    // Get study analytics for today
    const allSessions = AnalyticsService.getSessions();
    const todaySessions = allSessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime() && 
             (!studyPackId || session.studyPackId === studyPackId);
    });

    const flashcardsReviewed = todaySessions
      .filter(s => s.type === 'flashcards')
      .reduce((sum, s) => sum + (s.flashcardStats?.cardsReviewed || 0), 0);

    const quizQuestions = todaySessions
      .filter(s => s.type === 'quiz')
      .reduce((sum, s) => sum + (s.performance?.totalQuestions || 0), 0);

    const studyTime = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);

    // Extract topics from study sessions and journal
    const topics = this.extractTopics(todaySessions, journalEntry);

    // Generate AI summary
    const contentForSummary = [];
    if (journalEntry) {
      contentForSummary.push(journalEntry.polishedText);
    }
    contentForSummary.push(...topics);

    const aiSummary = await MockAIService.summarizeContent(contentForSummary);

    const studiedToday = todaySessions.length > 0 || !!journalEntry;

    const recap: DailyRecap = {
      date: new Date(),
      studyPackId,
      aiSummary,
      flashcardsReviewed,
      quizQuestions,
      studyTime,
      topicsStudied: topics,
      journalEntry: journalEntry || undefined,
      streakDays: journalStreak,
      badges: journalBadges,
      studiedToday
    };

    // Save recap
    this.saveRecap(recap);

    return recap;
  }

  private static extractTopics(sessions: any[], journalEntry?: JournalEntry): string[] {
    const topics = new Set<string>();

    // Add generic topics based on session types
    sessions.forEach(session => {
      switch (session.type) {
        case 'flashcards':
          topics.add('flashcard review');
          break;
        case 'quiz':
          topics.add('quiz practice');
          break;
        case 'mindmap':
          topics.add('concept mapping');
          break;
      }
    });

    // Extract keywords from journal entry
    if (journalEntry) {
      const words = journalEntry.polishedText.toLowerCase().split(/\W+/);
      const studyKeywords = words.filter(word => 
        ['learn', 'study', 'understand', 'concept', 'theory', 'practice', 'review', 'knowledge'].some(keyword => 
          word.includes(keyword)
        )
      );
      
      if (studyKeywords.length > 0) {
        topics.add('personal reflection');
      }
    }

    return Array.from(topics);
  }

  private static saveRecap(recap: DailyRecap): void {
    const recaps = this.getRecaps();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Remove any existing recap for today
    const filteredRecaps = recaps.filter(r => {
      const recapDate = new Date(r.date);
      recapDate.setHours(0, 0, 0, 0);
      return recapDate.getTime() !== today.getTime();
    });

    filteredRecaps.unshift(recap);
    
    // Keep only last 30 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const recentRecaps = filteredRecaps.filter(r => new Date(r.date) >= cutoff);

    localStorage.setItem(this.RECAPS_KEY, JSON.stringify(recentRecaps));
  }

  static getRecaps(): DailyRecap[] {
    const stored = localStorage.getItem(this.RECAPS_KEY);
    if (!stored) return [];
    
    try {
      return JSON.parse(stored).map((recap: any) => ({
        ...recap,
        date: new Date(recap.date),
        journalEntry: recap.journalEntry ? {
          ...recap.journalEntry,
          date: new Date(recap.journalEntry.date)
        } : undefined
      }));
    } catch {
      return [];
    }
  }

  static getTodayRecap(studyPackId?: string): DailyRecap | null {
    const recaps = this.getRecaps();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return recaps.find(recap => {
      const recapDate = new Date(recap.date);
      recapDate.setHours(0, 0, 0, 0);
      return recapDate.getTime() === today.getTime() && 
             (!studyPackId || recap.studyPackId === studyPackId);
    }) || null;
  }

  static getRecentRecaps(days: number = 7, studyPackId?: string): DailyRecap[] {
    const recaps = this.getRecaps();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return recaps
      .filter(recap => 
        new Date(recap.date) >= cutoffDate && 
        (!studyPackId || recap.studyPackId === studyPackId)
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}
