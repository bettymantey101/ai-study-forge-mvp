export interface StudySession {
  id: string;
  studyPackId: string;
  type: 'flashcards' | 'quiz' | 'mindmap';
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  performance?: {
    totalQuestions?: number;
    correctAnswers?: number;
    accuracy?: number;
    averageTimePerQuestion?: number;
  };
  flashcardStats?: {
    cardsReviewed: number;
    cardsMarkedDifficult: number[];
    averageFlipTime: number;
  };
}

export interface StudyPackProgress {
  studyPackId: string;
  totalStudyTime: number; // in seconds
  sessionsCount: number;
  lastStudied: Date;
  averageAccuracy: number;
  strongAreas: string[];
  weakAreas: string[];
  streakDays: number;
  achievements: string[];
}

export interface QuizResult {
  questionId: string;
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  timeSpent: number; // in seconds
  timestamp: Date;
}

export class AnalyticsService {
  private static readonly SESSIONS_KEY = 'studyForge_sessions';
  private static readonly PROGRESS_KEY = 'studyForge_progress';
  private static readonly QUIZ_RESULTS_KEY = 'studyForge_quiz_results';

  static startSession(studyPackId: string, type: StudySession['type']): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    const session: StudySession = {
      id: sessionId,
      studyPackId,
      type,
      startTime: new Date()
    };

    const sessions = this.getSessions();
    sessions.push(session);
    localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));

    return sessionId;
  }

  static endSession(sessionId: string, performance?: StudySession['performance'], flashcardStats?: StudySession['flashcardStats']): void {
    const sessions = this.getSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex !== -1) {
      const endTime = new Date();
      sessions[sessionIndex].endTime = endTime;
      sessions[sessionIndex].duration = Math.floor((endTime.getTime() - sessions[sessionIndex].startTime.getTime()) / 1000);
      sessions[sessionIndex].performance = performance;
      sessions[sessionIndex].flashcardStats = flashcardStats;
      
      localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
      
      // Update progress
      this.updateProgress(sessions[sessionIndex]);
    }
  }

  static getSessions(): StudySession[] {
    const stored = localStorage.getItem(this.SESSIONS_KEY);
    if (!stored) return [];
    
    try {
      return JSON.parse(stored).map((session: any) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : undefined
      }));
    } catch {
      return [];
    }
  }

  static getSessionsForStudyPack(studyPackId: string): StudySession[] {
    return this.getSessions().filter(s => s.studyPackId === studyPackId);
  }

  static recordQuizResult(studyPackId: string, result: QuizResult): void {
    const results = this.getQuizResults();
    results.push({ ...result, studyPackId } as any);
    localStorage.setItem(this.QUIZ_RESULTS_KEY, JSON.stringify(results));
  }

  static getQuizResults(): (QuizResult & { studyPackId: string })[] {
    const stored = localStorage.getItem(this.QUIZ_RESULTS_KEY);
    if (!stored) return [];
    
    try {
      return JSON.parse(stored).map((result: any) => ({
        ...result,
        timestamp: new Date(result.timestamp)
      }));
    } catch {
      return [];
    }
  }

  static getQuizResultsForStudyPack(studyPackId: string): QuizResult[] {
    return this.getQuizResults()
      .filter(r => (r as any).studyPackId === studyPackId)
      .map(({ studyPackId, ...result }) => result);
  }

  private static updateProgress(session: StudySession): void {
    const progressMap = this.getProgressMap();
    const progress = progressMap.get(session.studyPackId) || this.createEmptyProgress(session.studyPackId);
    
    progress.totalStudyTime += session.duration || 0;
    progress.sessionsCount += 1;
    progress.lastStudied = new Date();
    
    if (session.performance) {
      const sessions = this.getSessionsForStudyPack(session.studyPackId);
      const accuracies = sessions
        .filter(s => s.performance?.accuracy !== undefined)
        .map(s => s.performance!.accuracy!);
      
      if (accuracies.length > 0) {
        progress.averageAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
      }
    }
    
    // Update streak
    progress.streakDays = this.calculateStreak(session.studyPackId);
    
    // Update achievements
    this.updateAchievements(progress);
    
    progressMap.set(session.studyPackId, progress);
    this.saveProgressMap(progressMap);
  }

  private static createEmptyProgress(studyPackId: string): StudyPackProgress {
    return {
      studyPackId,
      totalStudyTime: 0,
      sessionsCount: 0,
      lastStudied: new Date(),
      averageAccuracy: 0,
      strongAreas: [],
      weakAreas: [],
      streakDays: 0,
      achievements: []
    };
  }

  private static getProgressMap(): Map<string, StudyPackProgress> {
    const stored = localStorage.getItem(this.PROGRESS_KEY);
    if (!stored) return new Map();
    
    try {
      const progressArray = JSON.parse(stored);
      return new Map(progressArray.map((p: any) => [p.studyPackId, {
        ...p,
        lastStudied: new Date(p.lastStudied)
      }]));
    } catch {
      return new Map();
    }
  }

  private static saveProgressMap(progressMap: Map<string, StudyPackProgress>): void {
    const progressArray = Array.from(progressMap.values());
    localStorage.setItem(this.PROGRESS_KEY, JSON.stringify(progressArray));
  }

  static getProgress(studyPackId: string): StudyPackProgress {
    const progressMap = this.getProgressMap();
    return progressMap.get(studyPackId) || this.createEmptyProgress(studyPackId);
  }

  static getAllProgress(): StudyPackProgress[] {
    return Array.from(this.getProgressMap().values());
  }

  private static calculateStreak(studyPackId: string): number {
    const sessions = this.getSessionsForStudyPack(studyPackId)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    
    if (sessions.length === 0) return 0;
    
    let streak = 0;
    let lastDate = new Date();
    lastDate.setHours(0, 0, 0, 0);
    
    for (const session of sessions) {
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((lastDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === 0 || daysDiff === 1) {
        if (daysDiff === 1) streak++;
        lastDate = sessionDate;
      } else {
        break;
      }
    }
    
    return streak;
  }

  private static updateAchievements(progress: StudyPackProgress): void {
    const achievements = new Set(progress.achievements);
    
    if (progress.sessionsCount >= 5 && !achievements.has('consistent_learner')) {
      achievements.add('consistent_learner');
    }
    
    if (progress.streakDays >= 7 && !achievements.has('week_warrior')) {
      achievements.add('week_warrior');
    }
    
    if (progress.averageAccuracy >= 0.9 && !achievements.has('accuracy_master')) {
      achievements.add('accuracy_master');
    }
    
    if (progress.totalStudyTime >= 3600 && !achievements.has('time_champion')) {
      achievements.add('time_champion');
    }
    
    progress.achievements = Array.from(achievements);
  }

  static deleteProgress(studyPackId: string): void {
    const progressMap = this.getProgressMap();
    progressMap.delete(studyPackId);
    this.saveProgressMap(progressMap);
    
    // Also clean up sessions and quiz results
    const sessions = this.getSessions().filter(s => s.studyPackId !== studyPackId);
    localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
    
    const quizResults = this.getQuizResults().filter(r => (r as any).studyPackId !== studyPackId);
    localStorage.setItem(this.QUIZ_RESULTS_KEY, JSON.stringify(quizResults));
  }
}
