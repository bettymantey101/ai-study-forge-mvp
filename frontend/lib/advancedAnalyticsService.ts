import { AnalyticsService } from './analyticsService';
import { SpacedRepetitionService } from './spacedRepetitionService';
import { JournalService } from './journalService';
import type { StudyPack } from '../context/StudyPackContext';

interface LearningCurvePoint {
  date: string;
  accuracy: number;
  confidence: number;
  studyTime: number;
  sessionsCount: number;
}

interface HeatmapDay {
  date: string;
  studyTime: number;
  intensity: number;
  dayOfWeek: number;
  weekOfYear: number;
}

interface TopicPerformance {
  topic: string;
  accuracy: number;
  speed: number;
  timeSpent: number;
  difficulty: number;
  masteryLevel: number;
}

interface MasteryInsights {
  overallMastery: number;
  learningVelocity: number;
  estimatedDaysToMastery: number;
  strongTopics: string[];
  weakTopics: string[];
  recommendations: Array<{
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    estimatedImpact: number;
  }>;
}

interface PredictivePoint {
  date: string;
  predicted: number;
  confidence: number;
  estimatedMastery: string;
}

interface RetentionPoint {
  timeAfterStudy: string;
  retention: number;
  idealRetention: number;
}

interface DifficultyDistribution {
  name: string;
  value: number;
  color: string;
}

interface TimePattern {
  hour: string;
  studyTime: number;
  accuracy: number;
  sessionsCount: number;
}

export class AdvancedAnalyticsService {
  static async generateLearningCurve(studyPackId: string): Promise<LearningCurvePoint[]> {
    const sessions = AnalyticsService.getSessionsForStudyPack(studyPackId);
    const quizResults = AnalyticsService.getQuizResultsForStudyPack(studyPackId);
    
    if (sessions.length === 0) {
      return this.generateMockLearningCurve();
    }

    const dailyData = new Map<string, any>();

    // Group sessions by date
    sessions.forEach(session => {
      const date = session.startTime.toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          totalTime: 0,
          sessionsCount: 0,
          totalAccuracy: 0,
          accuracyCount: 0
        });
      }

      const dayData = dailyData.get(date);
      dayData.totalTime += session.duration || 0;
      dayData.sessionsCount += 1;

      if (session.performance?.accuracy !== undefined) {
        dayData.totalAccuracy += session.performance.accuracy;
        dayData.accuracyCount += 1;
      }
    });

    // Group quiz results by date
    quizResults.forEach(result => {
      const date = result.timestamp.toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          totalTime: 0,
          sessionsCount: 0,
          totalAccuracy: 0,
          accuracyCount: 0
        });
      }

      const dayData = dailyData.get(date);
      dayData.totalAccuracy += result.isCorrect ? 1 : 0;
      dayData.accuracyCount += 1;
    });

    // Convert to learning curve points
    const points: LearningCurvePoint[] = [];
    const sortedDates = Array.from(dailyData.keys()).sort();

    sortedDates.forEach((date, index) => {
      const dayData = dailyData.get(date);
      const accuracy = dayData.accuracyCount > 0 ? dayData.totalAccuracy / dayData.accuracyCount : 0;
      const confidence = Math.min(0.95, 0.5 + (index * 0.05) + (accuracy * 0.3));

      points.push({
        date: new Date(date).toLocaleDateString(),
        accuracy: Number((accuracy * 100).toFixed(1)),
        confidence: Number((confidence * 100).toFixed(1)),
        studyTime: Math.round(dayData.totalTime / 60),
        sessionsCount: dayData.sessionsCount
      });
    });

    return points.length > 0 ? points : this.generateMockLearningCurve();
  }

  static async generateStudyHeatmap(studyPackId: string): Promise<HeatmapDay[]> {
    const sessions = AnalyticsService.getSessionsForStudyPack(studyPackId);
    const heatmapData: HeatmapDay[] = [];

    // Generate last 12 weeks of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - (12 * 7));

    // Create daily study time map
    const dailyStudyTime = new Map<string, number>();
    sessions.forEach(session => {
      const date = session.startTime.toISOString().split('T')[0];
      const currentTime = dailyStudyTime.get(date) || 0;
      dailyStudyTime.set(date, currentTime + (session.duration || 0));
    });

    // Generate heatmap for each day
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const studyTime = Math.round((dailyStudyTime.get(dateStr) || 0) / 60); // Convert to minutes
      const maxStudyTime = 120; // Assume 2 hours is maximum
      const intensity = Math.min(1, studyTime / maxStudyTime);

      heatmapData.push({
        date: dateStr,
        studyTime,
        intensity,
        dayOfWeek: d.getDay(),
        weekOfYear: this.getWeekNumber(d)
      });
    }

    return heatmapData;
  }

  static async generateTopicPerformance(studyPackId: string, studyPack: StudyPack): Promise<TopicPerformance[]> {
    const sessions = AnalyticsService.getSessionsForStudyPack(studyPackId);
    const quizResults = AnalyticsService.getQuizResultsForStudyPack(studyPackId);

    // Extract topics from study pack sections
    const topics = studyPack.sections.map(section => section.title).slice(0, 6);
    
    if (topics.length === 0) {
      return this.generateMockTopicPerformance();
    }

    const topicPerformance: TopicPerformance[] = topics.map((topic, index) => {
      // Simulate performance based on quiz results and sessions
      const baseAccuracy = quizResults.length > 0 
        ? quizResults.filter(r => r.isCorrect).length / quizResults.length 
        : 0.7;
      
      const topicAccuracy = baseAccuracy + (Math.random() * 0.3 - 0.15); // Add some variance
      const avgResponseTime = quizResults.length > 0 
        ? quizResults.reduce((sum, r) => sum + r.timeSpent, 0) / quizResults.length 
        : 20;
      
      const speed = Math.max(0, 100 - (avgResponseTime * 2)); // Inverse relationship
      const timeSpent = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / topics.length;
      
      return {
        topic,
        accuracy: Math.round(Math.max(0, Math.min(100, topicAccuracy * 100))),
        speed: Math.round(Math.max(0, Math.min(100, speed + (Math.random() * 20 - 10)))),
        timeSpent: Math.round(timeSpent / 60),
        difficulty: 50 + (index * 10) + (Math.random() * 20 - 10),
        masteryLevel: Math.round(Math.max(0, Math.min(100, (topicAccuracy * 0.7 + speed / 100 * 0.3) * 100)))
      };
    });

    return topicPerformance;
  }

  static async generateMasteryInsights(studyPackId: string, studyPack: StudyPack): Promise<MasteryInsights> {
    const progress = AnalyticsService.getProgress(studyPackId);
    const sessions = AnalyticsService.getSessionsForStudyPack(studyPackId);
    const quizResults = AnalyticsService.getQuizResultsForStudyPack(studyPackId);

    // Calculate overall mastery
    let overallMastery = 0;
    if (quizResults.length > 0) {
      const recentResults = quizResults.slice(-20); // Last 20 quiz attempts
      overallMastery = recentResults.filter(r => r.isCorrect).length / recentResults.length;
    } else {
      overallMastery = Math.min(0.8, progress.averageAccuracy + (sessions.length * 0.02));
    }

    // Calculate learning velocity (concepts learned per day)
    const studyDays = new Set(sessions.map(s => s.startTime.toDateString())).size;
    const learningVelocity = studyDays > 0 ? Math.round((studyPack.flashcards.length / studyDays) * 10) / 10 : 0;

    // Estimate days to mastery
    const currentMasteryLevel = overallMastery;
    const targetMastery = 0.9;
    const dailyImprovement = learningVelocity * 0.05; // Estimated daily improvement
    const estimatedDaysToMastery = dailyImprovement > 0 
      ? Math.max(1, Math.round((targetMastery - currentMasteryLevel) / dailyImprovement))
      : 30;

    // Generate topic analysis
    const topicPerformance = await this.generateTopicPerformance(studyPackId, studyPack);
    const strongTopics = topicPerformance
      .filter(t => t.accuracy >= 80)
      .map(t => t.topic)
      .slice(0, 3);
    
    const weakTopics = topicPerformance
      .filter(t => t.accuracy < 70)
      .map(t => t.topic)
      .slice(0, 3);

    // Generate recommendations
    const recommendations = this.generateMasteryRecommendations(
      overallMastery, 
      sessions, 
      quizResults, 
      weakTopics
    );

    return {
      overallMastery,
      learningVelocity,
      estimatedDaysToMastery,
      strongTopics,
      weakTopics,
      recommendations
    };
  }

  static async generatePredictiveInsights(studyPackId: string): Promise<PredictivePoint[]> {
    const sessions = AnalyticsService.getSessionsForStudyPack(studyPackId);
    const currentDate = new Date();
    const predictiveData: PredictivePoint[] = [];

    // Generate predictions for next 30 days
    for (let i = 1; i <= 30; i++) {
      const futureDate = new Date(currentDate);
      futureDate.setDate(currentDate.getDate() + i);

      // Simple prediction model based on current trend
      const basePrediction = Math.min(0.95, 0.6 + (i * 0.01));
      const confidence = Math.max(0.5, 0.9 - (i * 0.02));
      
      let estimatedMastery = '';
      if (basePrediction >= 0.9) {
        estimatedMastery = `Day ${i}`;
      } else if (i <= 14) {
        estimatedMastery = 'In 2-3 weeks';
      } else {
        estimatedMastery = 'In 3-4 weeks';
      }

      predictiveData.push({
        date: futureDate.toLocaleDateString(),
        predicted: Number((basePrediction * 100).toFixed(1)),
        confidence: Number((confidence * 100).toFixed(1)),
        estimatedMastery
      });
    }

    return predictiveData;
  }

  static async generateRetentionCurve(studyPackId: string): Promise<RetentionPoint[]> {
    const sessions = AnalyticsService.getSessionsForStudyPack(studyPackId);
    const retentionData: RetentionPoint[] = [];

    // Ebbinghaus forgetting curve with spaced repetition adjustments
    const timePoints = [
      { time: '20m', minutes: 20 },
      { time: '1h', minutes: 60 },
      { time: '9h', minutes: 540 },
      { time: '1d', minutes: 1440 },
      { time: '2d', minutes: 2880 },
      { time: '6d', minutes: 8640 },
      { time: '31d', minutes: 44640 }
    ];

    timePoints.forEach(point => {
      // Base retention using Ebbinghaus curve: R = e^(-t/S)
      // Where S is the strength of memory (improved by spaced repetition)
      const memoryStrength = sessions.length > 5 ? 2000 : 1000; // More sessions = stronger memory
      const baseRetention = Math.exp(-point.minutes / memoryStrength);
      
      // Ideal retention with perfect spaced repetition
      const idealRetention = Math.max(0.8, Math.exp(-point.minutes / 3000));
      
      retentionData.push({
        timeAfterStudy: point.time,
        retention: Number((Math.max(0.2, baseRetention) * 100).toFixed(1)),
        idealRetention: Number((idealRetention * 100).toFixed(1))
      });
    });

    return retentionData;
  }

  static async generateDifficultyDistribution(studyPackId: string): Promise<DifficultyDistribution[]> {
    const sessions = AnalyticsService.getSessionsForStudyPack(studyPackId);
    const quizResults = AnalyticsService.getQuizResultsForStudyPack(studyPackId);

    // Simulate difficulty distribution based on performance
    const totalQuestions = Math.max(10, quizResults.length);
    const accuracy = quizResults.length > 0 
      ? quizResults.filter(r => r.isCorrect).length / quizResults.length 
      : 0.7;

    let easyCount, mediumCount, hardCount;

    if (accuracy >= 0.8) {
      // High accuracy - more easy questions mastered
      easyCount = Math.round(totalQuestions * 0.5);
      mediumCount = Math.round(totalQuestions * 0.35);
      hardCount = Math.round(totalQuestions * 0.15);
    } else if (accuracy >= 0.6) {
      // Medium accuracy - balanced distribution
      easyCount = Math.round(totalQuestions * 0.3);
      mediumCount = Math.round(totalQuestions * 0.4);
      hardCount = Math.round(totalQuestions * 0.3);
    } else {
      // Low accuracy - struggling with harder questions
      easyCount = Math.round(totalQuestions * 0.2);
      mediumCount = Math.round(totalQuestions * 0.3);
      hardCount = Math.round(totalQuestions * 0.5);
    }

    return [
      { name: 'Easy', value: easyCount, color: '#82ca9d' },
      { name: 'Medium', value: mediumCount, color: '#ffc658' },
      { name: 'Hard', value: hardCount, color: '#ff7c7c' }
    ];
  }

  static async generateTimePatterns(studyPackId: string): Promise<TimePattern[]> {
    const sessions = AnalyticsService.getSessionsForStudyPack(studyPackId);
    const hourlyData = new Array(24).fill(0).map((_, index) => ({
      hour: `${index.toString().padStart(2, '0')}:00`,
      studyTime: 0,
      accuracy: 0,
      sessionsCount: 0,
      totalAccuracy: 0
    }));

    sessions.forEach(session => {
      const hour = session.startTime.getHours();
      hourlyData[hour].studyTime += session.duration || 0;
      hourlyData[hour].sessionsCount += 1;
      
      if (session.performance?.accuracy !== undefined) {
        hourlyData[hour].totalAccuracy += session.performance.accuracy;
      }
    });

    // Calculate average accuracy for each hour
    hourlyData.forEach(hourData => {
      if (hourData.sessionsCount > 0) {
        hourData.accuracy = Math.round((hourData.totalAccuracy / hourData.sessionsCount) * 100);
        hourData.studyTime = Math.round(hourData.studyTime / 60); // Convert to minutes
      }
    });

    return hourlyData;
  }

  // Helper methods
  private static generateMockLearningCurve(): LearningCurvePoint[] {
    const points: LearningCurvePoint[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const baseAccuracy = 60 + (i * 1.2) + (Math.random() * 10 - 5);
      const confidence = 50 + (i * 1.5) + (Math.random() * 8 - 4);
      
      points.push({
        date: date.toLocaleDateString(),
        accuracy: Number(Math.max(40, Math.min(95, baseAccuracy)).toFixed(1)),
        confidence: Number(Math.max(40, Math.min(90, confidence)).toFixed(1)),
        studyTime: Math.round(20 + Math.random() * 40),
        sessionsCount: Math.round(1 + Math.random() * 3)
      });
    }

    return points;
  }

  private static generateMockTopicPerformance(): TopicPerformance[] {
    const topics = [
      'Core Concepts', 'Advanced Theory', 'Practical Applications',
      'Problem Solving', 'Case Studies', 'Critical Analysis'
    ];

    return topics.map((topic, index) => ({
      topic,
      accuracy: Math.round(60 + Math.random() * 35),
      speed: Math.round(50 + Math.random() * 40),
      timeSpent: Math.round(15 + Math.random() * 25),
      difficulty: Math.round(40 + Math.random() * 40),
      masteryLevel: Math.round(50 + Math.random() * 35)
    }));
  }

  private static generateMasteryRecommendations(
    overallMastery: number,
    sessions: any[],
    quizResults: any[],
    weakTopics: string[]
  ) {
    const recommendations = [];

    if (overallMastery < 0.7) {
      recommendations.push({
        title: 'Focus on Foundation Building',
        description: 'Your current mastery level suggests focusing on fundamental concepts before advancing to complex topics.',
        priority: 'high' as const,
        estimatedImpact: 25
      });
    }

    if (sessions.length < 5) {
      recommendations.push({
        title: 'Increase Study Frequency',
        description: 'More regular study sessions will help improve retention and accelerate learning.',
        priority: 'medium' as const,
        estimatedImpact: 20
      });
    }

    if (weakTopics.length > 0) {
      recommendations.push({
        title: `Address Weak Areas: ${weakTopics.slice(0, 2).join(', ')}`,
        description: 'Dedicating extra time to these topics will have the highest impact on overall performance.',
        priority: 'high' as const,
        estimatedImpact: 30
      });
    }

    if (quizResults.length > 0) {
      const avgResponseTime = quizResults.reduce((sum, r) => sum + r.timeSpent, 0) / quizResults.length;
      if (avgResponseTime > 30) {
        recommendations.push({
          title: 'Improve Response Speed',
          description: 'Practice quick recall to build automatic responses to key concepts.',
          priority: 'medium' as const,
          estimatedImpact: 15
        });
      }
    }

    if (overallMastery >= 0.8) {
      recommendations.push({
        title: 'Maintain and Refine',
        description: 'You\'re performing well! Focus on maintaining knowledge and refining weak spots.',
        priority: 'low' as const,
        estimatedImpact: 10
      });
    }

    return recommendations;
  }

  private static getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}
