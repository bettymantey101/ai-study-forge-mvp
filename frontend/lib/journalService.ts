export interface JournalEntry {
  id: string;
  date: Date;
  originalText: string;
  polishedText: string;
  wordCount: number;
  studyPackId?: string;
}

export class JournalService {
  private static readonly ENTRIES_KEY = 'studyForge_journal_entries';
  private static readonly BADGES_KEY = 'studyForge_journal_badges';

  static saveEntry(originalText: string, polishedText: string, studyPackId?: string): JournalEntry {
    const entries = this.getEntries();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Remove any existing entry for today
    const filteredEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() !== today.getTime();
    });

    const newEntry: JournalEntry = {
      id: `journal_${Date.now()}`,
      date: new Date(),
      originalText,
      polishedText,
      wordCount: polishedText.trim().split(/\s+/).length,
      studyPackId
    };

    filteredEntries.unshift(newEntry);
    localStorage.setItem(this.ENTRIES_KEY, JSON.stringify(filteredEntries));

    // Check for new badges
    this.updateBadges(filteredEntries);

    return newEntry;
  }

  static getEntries(): JournalEntry[] {
    const stored = localStorage.getItem(this.ENTRIES_KEY);
    if (!stored) return [];
    
    try {
      return JSON.parse(stored).map((entry: any) => ({
        ...entry,
        date: new Date(entry.date)
      }));
    } catch {
      return [];
    }
  }

  static getTodayEntry(): JournalEntry | null {
    const entries = this.getEntries();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return entries.find(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    }) || null;
  }

  static getRecentEntries(days: number = 7): JournalEntry[] {
    const entries = this.getEntries();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return entries
      .filter(entry => new Date(entry.date) >= cutoffDate)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  static getStreak(): number {
    const entries = this.getEntries()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (entries.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const entry of entries) {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === streak || (streak === 0 && daysDiff <= 1)) {
        streak++;
        currentDate = entryDate;
      } else {
        break;
      }
    }

    return streak;
  }

  static getBadges(): string[] {
    const stored = localStorage.getItem(this.BADGES_KEY);
    if (!stored) return [];
    
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  private static updateBadges(entries: JournalEntry[]): void {
    const currentBadges = new Set(this.getBadges());
    const newBadges = new Set(currentBadges);

    // First entry badge
    if (entries.length >= 1 && !currentBadges.has('First Reflection')) {
      newBadges.add('First Reflection');
    }

    // Refined Words badge (after first polish)
    if (entries.length >= 1 && !currentBadges.has('Refined Words')) {
      newBadges.add('Refined Words');
    }

    // Streak badges
    const streak = this.getStreak();
    if (streak >= 3 && !currentBadges.has('3-Day Reflection Streak')) {
      newBadges.add('3-Day Reflection Streak');
    }
    if (streak >= 7 && !currentBadges.has('Weekly Reflector')) {
      newBadges.add('Weekly Reflector');
    }
    if (streak >= 30 && !currentBadges.has('Monthly Sage')) {
      newBadges.add('Monthly Sage');
    }

    // Word count badges
    const totalWords = entries.reduce((sum, entry) => sum + entry.wordCount, 0);
    if (totalWords >= 500 && !currentBadges.has('Wordsmith')) {
      newBadges.add('Wordsmith');
    }
    if (totalWords >= 1000 && !currentBadges.has('Eloquent Writer')) {
      newBadges.add('Eloquent Writer');
    }

    // Consistency badge
    if (entries.length >= 10 && !currentBadges.has('Consistent Reflector')) {
      newBadges.add('Consistent Reflector');
    }

    localStorage.setItem(this.BADGES_KEY, JSON.stringify(Array.from(newBadges)));
  }

  static deleteAllEntries(): void {
    localStorage.removeItem(this.ENTRIES_KEY);
    localStorage.removeItem(this.BADGES_KEY);
  }
}
