interface CardReview {
  cardId: string;
  studyPackId: string;
  quality: number; // 1 (again) to 4 (easy)
  reviewDate: Date;
  interval: number; // days
  easeFactor: number;
  repetitions: number;
  nextReview: Date;
}

interface StudySession {
  studyPackId: string;
  date: Date;
  cardsReviewed: number;
  averageQuality: number;
}

export class SpacedRepetitionService {
  private static readonly REVIEWS_KEY = 'studyForge_sr_reviews';
  private static readonly SESSIONS_KEY = 'studyForge_sr_sessions';

  static getDueCards(studyPackId: string, flashcards: any[]): any[] {
    const reviews = this.getReviews();
    const now = new Date();
    const dueCards: any[] = [];

    for (const card of flashcards) {
      const review = reviews.find(r => r.cardId === card.id && r.studyPackId === studyPackId);
      
      if (!review || new Date(review.nextReview) <= now) {
        dueCards.push({
          ...card,
          lastReview: review?.reviewDate ? new Date(review.reviewDate) : null,
          nextReview: review?.nextReview ? new Date(review.nextReview) : now,
          interval: review?.interval || 0,
          repetitions: review?.repetitions || 0
        });
      }
    }

    // Sort by priority: new cards first, then by due date
    return dueCards.sort((a, b) => {
      if (!a.lastReview && b.lastReview) return -1;
      if (a.lastReview && !b.lastReview) return 1;
      return a.nextReview.getTime() - b.nextReview.getTime();
    });
  }

  static getUpcomingCards(studyPackId: string, flashcards: any[], limit: number = 10): any[] {
    const reviews = this.getReviews();
    const now = new Date();
    const upcomingCards: any[] = [];

    for (const card of flashcards) {
      const review = reviews.find(r => r.cardId === card.id && r.studyPackId === studyPackId);
      
      if (review && new Date(review.nextReview) > now) {
        upcomingCards.push({
          ...card,
          nextReview: new Date(review.nextReview),
          interval: review.interval
        });
      }
    }

    return upcomingCards
      .sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime())
      .slice(0, limit);
  }

  static recordReview(studyPackId: string, cardId: string, quality: number): void {
    const reviews = this.getReviews();
    const existingReview = reviews.find(r => r.cardId === cardId && r.studyPackId === studyPackId);
    
    let interval: number;
    let easeFactor: number;
    let repetitions: number;

    if (existingReview) {
      easeFactor = Math.max(1.3, existingReview.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
      repetitions = quality < 3 ? 0 : existingReview.repetitions + 1;
    } else {
      easeFactor = 2.5;
      repetitions = quality < 3 ? 0 : 1;
    }

    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round((existingReview?.interval || 1) * easeFactor);
    }

    // Apply quality-based adjustments
    switch (quality) {
      case 1: // Again
        interval = Math.max(1, Math.round(interval * 0.2));
        break;
      case 2: // Hard
        interval = Math.max(1, Math.round(interval * 0.6));
        break;
      case 3: // Good
        // Use calculated interval
        break;
      case 4: // Easy
        interval = Math.round(interval * 1.3);
        break;
    }

    const now = new Date();
    const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

    const newReview: CardReview = {
      cardId,
      studyPackId,
      quality,
      reviewDate: now,
      interval,
      easeFactor,
      repetitions,
      nextReview
    };

    const updatedReviews = reviews.filter(r => !(r.cardId === cardId && r.studyPackId === studyPackId));
    updatedReviews.push(newReview);
    
    localStorage.setItem(this.REVIEWS_KEY, JSON.stringify(updatedReviews));
    this.updateSessionStats(studyPackId, quality);
  }

  static getTodayStats(studyPackId: string): any {
    const reviews = this.getReviews();
    const sessions = this.getSessions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const todayReviews = reviews.filter(r => {
      const reviewDate = new Date(r.reviewDate);
      return r.studyPackId === studyPackId && 
             reviewDate >= today && 
             reviewDate < tomorrow;
    });

    const newCards = todayReviews.filter(r => r.repetitions === 1).length;
    const accuracy = todayReviews.length > 0 
      ? todayReviews.reduce((sum, r) => sum + (r.quality >= 3 ? 1 : 0), 0) / todayReviews.length 
      : 0;

    const streak = this.calculateStreak(studyPackId);

    return {
      reviewed: todayReviews.length,
      learned: newCards,
      accuracy,
      streak
    };
  }

  private static updateSessionStats(studyPackId: string, quality: number): void {
    const sessions = this.getSessions();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todaySession = sessions.find(s => {
      const sessionDate = new Date(s.date);
      return s.studyPackId === studyPackId && 
             sessionDate.getTime() === today.getTime();
    });

    if (todaySession) {
      const totalQuality = todaySession.averageQuality * todaySession.cardsReviewed + quality;
      todaySession.cardsReviewed += 1;
      todaySession.averageQuality = totalQuality / todaySession.cardsReviewed;
    } else {
      todaySession = {
        studyPackId,
        date: today,
        cardsReviewed: 1,
        averageQuality: quality
      };
      sessions.push(todaySession);
    }

    localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
  }

  private static calculateStreak(studyPackId: string): number {
    const sessions = this.getSessions()
      .filter(s => s.studyPackId === studyPackId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sessions.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const session of sessions) {
      const sessionDate = new Date(session.date);
      const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === streak || (streak === 0 && daysDiff <= 1)) {
        streak++;
        currentDate = sessionDate;
      } else {
        break;
      }
    }

    return streak;
  }

  private static getReviews(): CardReview[] {
    const stored = localStorage.getItem(this.REVIEWS_KEY);
    if (!stored) return [];
    
    try {
      return JSON.parse(stored).map((review: any) => ({
        ...review,
        reviewDate: new Date(review.reviewDate),
        nextReview: new Date(review.nextReview)
      }));
    } catch {
      return [];
    }
  }

  private static getSessions(): StudySession[] {
    const stored = localStorage.getItem(this.SESSIONS_KEY);
    if (!stored) return [];
    
    try {
      return JSON.parse(stored).map((session: any) => ({
        ...session,
        date: new Date(session.date)
      }));
    } catch {
      return [];
    }
  }

  static deleteData(studyPackId: string): void {
    const reviews = this.getReviews().filter(r => r.studyPackId !== studyPackId);
    const sessions = this.getSessions().filter(s => s.studyPackId !== studyPackId);
    
    localStorage.setItem(this.REVIEWS_KEY, JSON.stringify(reviews));
    localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
  }
}
