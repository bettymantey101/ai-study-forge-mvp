export interface StudyRecommendation {
  type: 'flashcard_review' | 'break_time' | 'knowledge_gap' | 'study_plan' | 'focus_area';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  actionItems: string[];
  reasoning: string;
  estimatedTime?: number; // in minutes
  cardIds?: string[];
  topicAreas?: string[];
  confidence: number; // 0-1 confidence score
}

export interface StudyPlan {
  id: string;
  studyPackId: string;
  generatedAt: Date;
  totalDuration: number; // in minutes
  sessions: StudySession[];
  recommendations: StudyRecommendation[];
  completionRate: number;
}

export interface StudySession {
  id: string;
  type: 'flashcards' | 'quiz' | 'review' | 'break';
  duration: number; // in minutes
  content: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  order: number;
}

export interface StudyPatterns {
  averageSessionLength: number;
  preferredStudyTime: 'morning' | 'afternoon' | 'evening' | 'night';
  breakFrequency: number; // minutes between breaks
  attentionSpan: number; // minutes before performance drops
  strongSubjects: string[];
  weakSubjects: string[];
  consistencyScore: number; // 0-1
}

export class RecommendationService {
  private static readonly STUDY_PLANS_KEY = 'studyForge_study_plans';
  private static readonly PATTERNS_KEY = 'studyForge_study_patterns';

  static async generateRecommendations(studyPackId: string): Promise<StudyRecommendation[]> {
    const recommendations: StudyRecommendation[] = [];

    // Import required services
    const { AnalyticsService } = await import('./analyticsService');
    const { SpacedRepetitionService } = await import('./spacedRepetitionService');
    const { useStudyPacks } = await import('../context/StudyPackContext');

    // Get study data
    const progress = AnalyticsService.getProgress(studyPackId);
    const sessions = AnalyticsService.getSessionsForStudyPack(studyPackId);
    const quizResults = AnalyticsService.getQuizResultsForStudyPack(studyPackId);
    const patterns = this.analyzeStudyPatterns(studyPackId);

    // 1. Spaced Repetition Recommendations
    const srRecommendations = await this.generateSpacedRepetitionRecommendations(studyPackId);
    recommendations.push(...srRecommendations);

    // 2. Knowledge Gap Analysis
    const gapRecommendations = this.analyzeKnowledgeGaps(quizResults, progress);
    recommendations.push(...gapRecommendations);

    // 3. Break Time Recommendations
    const breakRecommendations = this.generateBreakRecommendations(patterns, sessions);
    recommendations.push(...breakRecommendations);

    // 4. Focus Area Recommendations
    const focusRecommendations = this.generateFocusAreaRecommendations(patterns, progress);
    recommendations.push(...focusRecommendations);

    // 5. Study Plan Optimization
    const planRecommendations = this.generateStudyPlanRecommendations(patterns, progress);
    recommendations.push(...planRecommendations);

    // Sort by priority and confidence
    return recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });
  }

  private static async generateSpacedRepetitionRecommendations(studyPackId: string): Promise<StudyRecommendation[]> {
    const recommendations: StudyRecommendation[] = [];
    
    try {
      const { SpacedRepetitionService } = await import('./spacedRepetitionService');
      
      // This would normally get flashcards from the study pack
      // For now, we'll simulate some due cards
      const dueCardsCount = Math.floor(Math.random() * 15) + 5; // 5-20 due cards
      const overdueDays = Math.floor(Math.random() * 7); // 0-7 days overdue

      if (dueCardsCount > 10) {
        recommendations.push({
          type: 'flashcard_review',
          priority: overdueDays > 3 ? 'urgent' : 'high',
          title: `${dueCardsCount} Cards Due for Review`,
          description: `You have ${dueCardsCount} flashcards ready for spaced repetition review. Some are ${overdueDays} days overdue.`,
          actionItems: [
            'Start with the most overdue cards first',
            'Focus on cards you marked as difficult',
            'Take breaks between review sessions',
            'Be honest with your self-assessment ratings'
          ],
          reasoning: 'Spaced repetition is most effective when reviews are done on time. Overdue cards may require more repetitions to maintain retention.',
          estimatedTime: Math.ceil(dueCardsCount * 2), // 2 minutes per card
          confidence: 0.95
        });
      } else if (dueCardsCount > 0) {
        recommendations.push({
          type: 'flashcard_review',
          priority: 'medium',
          title: `${dueCardsCount} Cards Ready for Review`,
          description: 'A manageable number of flashcards are due for review today.',
          actionItems: [
            'Complete these reviews to maintain your streak',
            'Rate each card honestly based on recall difficulty'
          ],
          reasoning: 'Regular review maintains strong memory retention.',
          estimatedTime: dueCardsCount * 2,
          confidence: 0.9
        });
      }
    } catch (error) {
      console.error('Error generating spaced repetition recommendations:', error);
    }

    return recommendations;
  }

  private static analyzeKnowledgeGaps(quizResults: any[], progress: any): StudyRecommendation[] {
    const recommendations: StudyRecommendation[] = [];

    if (quizResults.length === 0) {
      recommendations.push({
        type: 'knowledge_gap',
        priority: 'medium',
        title: 'Take Practice Quizzes',
        description: 'No quiz data available to identify knowledge gaps.',
        actionItems: [
          'Complete at least 3 practice quizzes',
          'Focus on different topic areas',
          'Review incorrect answers thoroughly'
        ],
        reasoning: 'Quiz performance data helps identify specific areas that need more attention.',
        estimatedTime: 15,
        confidence: 0.8
      });
      return recommendations;
    }

    // Analyze accuracy patterns
    const recentResults = quizResults.slice(-20); // Last 20 questions
    const accuracy = recentResults.filter(r => r.isCorrect).length / recentResults.length;
    const averageTime = recentResults.reduce((sum, r) => sum + r.timeSpent, 0) / recentResults.length;

    if (accuracy < 0.7) {
      recommendations.push({
        type: 'knowledge_gap',
        priority: 'high',
        title: 'Low Quiz Performance Detected',
        description: `Your recent quiz accuracy is ${Math.round(accuracy * 100)}%, indicating knowledge gaps.`,
        actionItems: [
          'Review fundamental concepts first',
          'Focus on frequently missed question types',
          'Create additional flashcards for weak areas',
          'Consider breaking down complex topics into smaller parts'
        ],
        reasoning: 'Accuracy below 70% suggests fundamental understanding issues that need addressing.',
        estimatedTime: 30,
        confidence: 0.9
      });
    }

    if (averageTime > 45) {
      recommendations.push({
        type: 'knowledge_gap',
        priority: 'medium',
        title: 'Slow Response Times',
        description: `Average response time of ${Math.round(averageTime)}s suggests uncertainty in answers.`,
        actionItems: [
          'Practice quick recall with flashcards',
          'Focus on building automatic responses to key concepts',
          'Time yourself during study sessions'
        ],
        reasoning: 'Slow response times often indicate incomplete understanding or lack of practice.',
        estimatedTime: 20,
        confidence: 0.8
      });
    }

    // Identify patterns in wrong answers
    const incorrectAnswers = recentResults.filter(r => !r.isCorrect);
    if (incorrectAnswers.length > 3) {
      recommendations.push({
        type: 'knowledge_gap',
        priority: 'medium',
        title: 'Review Incorrect Answers',
        description: `You've missed ${incorrectAnswers.length} questions recently. Reviewing these can prevent similar mistakes.`,
        actionItems: [
          'Go through each incorrect answer',
          'Understand why the correct answer is right',
          'Create flashcards for missed concepts',
          'Look for patterns in your mistakes'
        ],
        reasoning: 'Learning from mistakes is one of the most effective study strategies.',
        estimatedTime: incorrectAnswers.length * 3,
        confidence: 0.85
      });
    }

    return recommendations;
  }

  private static generateBreakRecommendations(patterns: StudyPatterns, sessions: any[]): StudyRecommendation[] {
    const recommendations: StudyRecommendation[] = [];

    // Check if user has been studying for too long without breaks
    const recentSessions = sessions.slice(-5);
    const averageSessionLength = recentSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / recentSessions.length / 60;

    if (averageSessionLength > 45) {
      recommendations.push({
        type: 'break_time',
        priority: 'medium',
        title: 'Take More Frequent Breaks',
        description: `Your average session length is ${Math.round(averageSessionLength)} minutes. Consider shorter, more frequent sessions.`,
        actionItems: [
          'Use the Pomodoro Technique (25 min study, 5 min break)',
          'Take a 15-minute break every 30-45 minutes',
          'Get up and move during breaks',
          'Stay hydrated and stretch'
        ],
        reasoning: 'Research shows that taking regular breaks improves focus and retention.',
        estimatedTime: 5,
        confidence: 0.8
      });
    }

    // Check study consistency
    if (patterns.consistencyScore < 0.6) {
      recommendations.push({
        type: 'break_time',
        priority: 'low',
        title: 'Establish Regular Study Schedule',
        description: 'Your study sessions are inconsistent. Regular scheduling can improve effectiveness.',
        actionItems: [
          'Set specific times for daily study',
          'Start with shorter, consistent sessions',
          'Use calendar reminders',
          'Track your consistency'
        ],
        reasoning: 'Consistent study schedules help build habits and improve long-term retention.',
        estimatedTime: 0,
        confidence: 0.7
      });
    }

    return recommendations;
  }

  private static generateFocusAreaRecommendations(patterns: StudyPatterns, progress: any): StudyRecommendation[] {
    const recommendations: StudyRecommendation[] = [];

    // Recommend focusing on weak areas
    if (patterns.weakSubjects.length > 0) {
      recommendations.push({
        type: 'focus_area',
        priority: 'high',
        title: 'Focus on Weak Areas',
        description: `Concentrate on ${patterns.weakSubjects.join(', ')} to improve overall performance.`,
        actionItems: [
          'Dedicate 60% of study time to weak subjects',
          'Break down difficult concepts into smaller parts',
          'Use multiple study methods (flashcards, quizzes, summaries)',
          'Seek additional resources for challenging topics'
        ],
        reasoning: 'Focusing on weak areas yields the highest improvement in overall performance.',
        estimatedTime: 40,
        topicAreas: patterns.weakSubjects,
        confidence: 0.9
      });
    }

    // Balance with strong areas
    if (patterns.strongSubjects.length > 0) {
      recommendations.push({
        type: 'focus_area',
        priority: 'low',
        title: 'Maintain Strong Areas',
        description: `Don't neglect ${patterns.strongSubjects.join(', ')} - light review helps maintain proficiency.`,
        actionItems: [
          'Spend 20% of time reviewing strong subjects',
          'Use these areas to build confidence',
          'Connect strong areas to weak areas when possible'
        ],
        reasoning: 'Maintaining strong areas prevents knowledge decay while building confidence.',
        estimatedTime: 15,
        topicAreas: patterns.strongSubjects,
        confidence: 0.75
      });
    }

    return recommendations;
  }

  private static generateStudyPlanRecommendations(patterns: StudyPatterns, progress: any): StudyRecommendation[] {
    const recommendations: StudyRecommendation[] = [];

    const optimalSessionLength = Math.min(patterns.attentionSpan, 45);
    
    recommendations.push({
      type: 'study_plan',
      priority: 'medium',
      title: 'Optimize Study Session Length',
      description: `Based on your attention patterns, ${optimalSessionLength}-minute sessions would be most effective.`,
      actionItems: [
        `Plan study sessions for ${optimalSessionLength} minutes`,
        'Include 5-10 minute breaks between sessions',
        'Save difficult topics for when you\'re most alert',
        'End sessions before fatigue sets in'
      ],
      reasoning: 'Matching session length to attention span maximizes learning efficiency.',
      estimatedTime: optimalSessionLength,
      confidence: 0.8
    });

    // Recommend study time based on patterns
    if (patterns.preferredStudyTime) {
      recommendations.push({
        type: 'study_plan',
        priority: 'low',
        title: `Study During Your ${patterns.preferredStudyTime} Peak`,
        description: `Your performance data suggests you learn best in the ${patterns.preferredStudyTime}.`,
        actionItems: [
          `Schedule important study sessions in the ${patterns.preferredStudyTime}`,
          'Use less optimal times for review and light practice',
          'Track how you feel during different study times'
        ],
        reasoning: 'Studying during peak performance times improves retention and reduces effort.',
        confidence: 0.7
      });
    }

    return recommendations;
  }

  static analyzeStudyPatterns(studyPackId: string): StudyPatterns {
    try {
      const stored = localStorage.getItem(`${this.PATTERNS_KEY}_${studyPackId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading study patterns:', error);
    }

    // Generate mock patterns if none exist
    const mockPatterns: StudyPatterns = {
      averageSessionLength: 25 + Math.random() * 20, // 25-45 minutes
      preferredStudyTime: ['morning', 'afternoon', 'evening', 'night'][Math.floor(Math.random() * 4)] as any,
      breakFrequency: 30 + Math.random() * 15, // 30-45 minutes
      attentionSpan: 35 + Math.random() * 25, // 35-60 minutes
      strongSubjects: this.generateMockSubjects(2),
      weakSubjects: this.generateMockSubjects(1),
      consistencyScore: 0.6 + Math.random() * 0.4 // 0.6-1.0
    };

    this.saveStudyPatterns(studyPackId, mockPatterns);
    return mockPatterns;
  }

  private static generateMockSubjects(count: number): string[] {
    const subjects = [
      'Core Concepts', 'Advanced Topics', 'Practical Applications',
      'Theoretical Framework', 'Case Studies', 'Problem Solving',
      'Fundamental Principles', 'Detailed Analysis', 'Critical Thinking'
    ];
    
    return subjects.slice(0, count);
  }

  static saveStudyPatterns(studyPackId: string, patterns: StudyPatterns): void {
    try {
      localStorage.setItem(`${this.PATTERNS_KEY}_${studyPackId}`, JSON.stringify(patterns));
    } catch (error) {
      console.error('Error saving study patterns:', error);
    }
  }

  static async generateOptimalStudyPlan(studyPackId: string, availableTime: number): Promise<StudyPlan> {
    const recommendations = await this.generateRecommendations(studyPackId);
    const patterns = this.analyzeStudyPatterns(studyPackId);
    
    const sessions: StudySession[] = [];
    let remainingTime = availableTime;
    let sessionOrder = 1;

    // Distribute time based on recommendations
    const highPriorityRecs = recommendations.filter(r => r.priority === 'urgent' || r.priority === 'high');
    const mediumPriorityRecs = recommendations.filter(r => r.priority === 'medium');
    
    // Allocate 60% of time to high priority items
    const highPriorityTime = Math.floor(availableTime * 0.6);
    const mediumPriorityTime = Math.floor(availableTime * 0.3);
    const breakTime = availableTime - highPriorityTime - mediumPriorityTime;

    // Create high priority sessions
    for (const rec of highPriorityRecs) {
      if (remainingTime <= 0) break;
      
      const sessionTime = Math.min(rec.estimatedTime || 20, highPriorityTime / highPriorityRecs.length, remainingTime);
      
      sessions.push({
        id: `session_${sessionOrder}`,
        type: rec.type === 'flashcard_review' ? 'flashcards' : 'review',
        duration: sessionTime,
        content: rec.actionItems.slice(0, 2),
        difficulty: rec.priority === 'urgent' ? 'hard' : 'medium',
        order: sessionOrder++
      });
      
      remainingTime -= sessionTime;
    }

    // Add break sessions
    if (breakTime > 5 && sessions.length > 0) {
      sessions.push({
        id: `session_${sessionOrder}`,
        type: 'break',
        duration: Math.min(breakTime, 15),
        content: ['Take a short break', 'Stretch and hydrate'],
        difficulty: 'easy',
        order: sessionOrder++
      });
    }

    // Create medium priority sessions
    for (const rec of mediumPriorityRecs.slice(0, 2)) {
      if (remainingTime <= 0) break;
      
      const sessionTime = Math.min(rec.estimatedTime || 15, mediumPriorityTime / 2, remainingTime);
      
      sessions.push({
        id: `session_${sessionOrder}`,
        type: rec.type === 'quiz' ? 'quiz' : 'review',
        duration: sessionTime,
        content: rec.actionItems.slice(0, 2),
        difficulty: 'medium',
        order: sessionOrder++
      });
      
      remainingTime -= sessionTime;
    }

    const studyPlan: StudyPlan = {
      id: `plan_${Date.now()}`,
      studyPackId,
      generatedAt: new Date(),
      totalDuration: availableTime,
      sessions,
      recommendations: recommendations.slice(0, 5),
      completionRate: 0
    };

    this.saveStudyPlan(studyPlan);
    return studyPlan;
  }

  static saveStudyPlan(plan: StudyPlan): void {
    try {
      const plans = this.getStudyPlans();
      const filtered = plans.filter(p => p.id !== plan.id);
      filtered.unshift(plan);
      
      // Keep only last 10 plans
      const recent = filtered.slice(0, 10);
      localStorage.setItem(this.STUDY_PLANS_KEY, JSON.stringify(recent));
    } catch (error) {
      console.error('Error saving study plan:', error);
    }
  }

  static getStudyPlans(): StudyPlan[] {
    try {
      const stored = localStorage.getItem(this.STUDY_PLANS_KEY);
      if (!stored) return [];
      
      return JSON.parse(stored).map((plan: any) => ({
        ...plan,
        generatedAt: new Date(plan.generatedAt)
      }));
    } catch (error) {
      console.error('Error loading study plans:', error);
      return [];
    }
  }

  static getLatestPlan(studyPackId: string): StudyPlan | null {
    const plans = this.getStudyPlans();
    return plans.find(p => p.studyPackId === studyPackId) || null;
  }

  static updatePlanProgress(planId: string, sessionId: string): void {
    try {
      const plans = this.getStudyPlans();
      const plan = plans.find(p => p.id === planId);
      
      if (plan) {
        const session = plan.sessions.find(s => s.id === sessionId);
        if (session) {
          const completedSessions = plan.sessions.filter(s => s.id === sessionId || (s as any).completed).length;
          plan.completionRate = completedSessions / plan.sessions.length;
          (session as any).completed = true;
          this.saveStudyPlan(plan);
        }
      }
    } catch (error) {
      console.error('Error updating plan progress:', error);
    }
  }
}
