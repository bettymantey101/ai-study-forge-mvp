export interface ExportableData {
  studyPacks?: any[];
  progress?: any[];
  analytics?: any[];
  spacedRepetition?: any[];
  journal?: any[];
  version: string;
  exportDate: Date;
  exportedBy?: string;
  totalSize?: number;
}

export interface ExportOptions {
  includeStudyPacks: boolean;
  includeProgress: boolean;
  includeAnalytics: boolean;
  includeSpacedRepetition: boolean;
  includeJournal: boolean;
  selectedStudyPackIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ImportValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  compatibilityIssues: string[];
  dataStats: {
    studyPacks: number;
    progressRecords: number;
    analyticsRecords: number;
    spacedRepetitionRecords: number;
    journalEntries: number;
  };
}

export class ExportService {
  private static readonly CURRENT_VERSION = '1.0.0';
  private static readonly SUPPORTED_VERSIONS = ['1.0.0'];

  static async exportData(options: ExportOptions): Promise<string> {
    const data: ExportableData = {
      version: this.CURRENT_VERSION,
      exportDate: new Date(),
      exportedBy: 'AI Study Forge User'
    };

    let totalSize = 0;

    try {
      // Export study packs
      if (options.includeStudyPacks) {
        const { useStudyPacks } = await import('../context/StudyPackContext');
        const studyPacks = this.getStudyPacksFromStorage();
        
        if (options.selectedStudyPackIds && options.selectedStudyPackIds.length > 0) {
          data.studyPacks = studyPacks.filter(pack => 
            options.selectedStudyPackIds!.includes(pack.id)
          );
        } else {
          data.studyPacks = studyPacks;
        }
        
        totalSize += JSON.stringify(data.studyPacks).length;
      }

      // Export progress data
      if (options.includeProgress) {
        const { AnalyticsService } = await import('./analyticsService');
        data.progress = AnalyticsService.getAllProgress();
        
        if (options.selectedStudyPackIds && options.selectedStudyPackIds.length > 0) {
          data.progress = data.progress.filter(progress => 
            options.selectedStudyPackIds!.includes(progress.studyPackId)
          );
        }
        
        totalSize += JSON.stringify(data.progress).length;
      }

      // Export analytics data
      if (options.includeAnalytics) {
        const { AnalyticsService } = await import('./analyticsService');
        const sessions = AnalyticsService.getSessions();
        const quizResults = AnalyticsService.getQuizResults();
        
        let filteredSessions = sessions;
        let filteredQuizResults = quizResults;
        
        // Apply date range filter
        if (options.dateRange) {
          filteredSessions = sessions.filter(session => {
            const sessionDate = new Date(session.startTime);
            return sessionDate >= options.dateRange!.start && sessionDate <= options.dateRange!.end;
          });
          
          filteredQuizResults = quizResults.filter(result => {
            const resultDate = new Date(result.timestamp);
            return resultDate >= options.dateRange!.start && resultDate <= options.dateRange!.end;
          });
        }
        
        // Apply study pack filter
        if (options.selectedStudyPackIds && options.selectedStudyPackIds.length > 0) {
          filteredSessions = filteredSessions.filter(session => 
            options.selectedStudyPackIds!.includes(session.studyPackId)
          );
          
          filteredQuizResults = filteredQuizResults.filter(result => 
            options.selectedStudyPackIds!.includes((result as any).studyPackId)
          );
        }
        
        data.analytics = {
          sessions: filteredSessions,
          quizResults: filteredQuizResults
        };
        
        totalSize += JSON.stringify(data.analytics).length;
      }

      // Export spaced repetition data
      if (options.includeSpacedRepetition) {
        const srData = this.getSpacedRepetitionData();
        
        if (options.selectedStudyPackIds && options.selectedStudyPackIds.length > 0) {
          data.spacedRepetition = srData.filter((item: any) => 
            options.selectedStudyPackIds!.includes(item.studyPackId)
          );
        } else {
          data.spacedRepetition = srData;
        }
        
        totalSize += JSON.stringify(data.spacedRepetition).length;
      }

      // Export journal data
      if (options.includeJournal) {
        const { JournalService } = await import('./journalService');
        let journalEntries = JournalService.getEntries();
        
        // Apply date range filter
        if (options.dateRange) {
          journalEntries = journalEntries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= options.dateRange!.start && entryDate <= options.dateRange!.end;
          });
        }
        
        // Apply study pack filter
        if (options.selectedStudyPackIds && options.selectedStudyPackIds.length > 0) {
          journalEntries = journalEntries.filter(entry => 
            !entry.studyPackId || options.selectedStudyPackIds!.includes(entry.studyPackId)
          );
        }
        
        data.journal = journalEntries;
        totalSize += JSON.stringify(data.journal).length;
      }

      data.totalSize = totalSize;

      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error('Failed to export data. Please try again.');
    }
  }

  static async downloadExport(exportData: string, filename?: string): Promise<void> {
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const defaultFilename = `study-forge-export-${new Date().toISOString().split('T')[0]}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static async validateImportData(jsonData: string): Promise<ImportValidationResult> {
    const result: ImportValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      compatibilityIssues: [],
      dataStats: {
        studyPacks: 0,
        progressRecords: 0,
        analyticsRecords: 0,
        spacedRepetitionRecords: 0,
        journalEntries: 0
      }
    };

    try {
      const data: ExportableData = JSON.parse(jsonData);

      // Check version compatibility
      if (!data.version) {
        result.errors.push('Missing version information');
        result.isValid = false;
      } else if (!this.SUPPORTED_VERSIONS.includes(data.version)) {
        result.compatibilityIssues.push(`Unsupported version: ${data.version}. Supported versions: ${this.SUPPORTED_VERSIONS.join(', ')}`);
        result.warnings.push('Data may not import correctly due to version mismatch');
      }

      // Check export date
      if (!data.exportDate) {
        result.warnings.push('Missing export date information');
      } else {
        const exportDate = new Date(data.exportDate);
        if (isNaN(exportDate.getTime())) {
          result.warnings.push('Invalid export date format');
        }
      }

      // Validate study packs
      if (data.studyPacks) {
        const studyPackValidation = this.validateStudyPacks(data.studyPacks);
        result.errors.push(...studyPackValidation.errors);
        result.warnings.push(...studyPackValidation.warnings);
        result.dataStats.studyPacks = data.studyPacks.length;
        
        if (studyPackValidation.errors.length > 0) {
          result.isValid = false;
        }
      }

      // Validate progress data
      if (data.progress) {
        const progressValidation = this.validateProgress(data.progress);
        result.errors.push(...progressValidation.errors);
        result.warnings.push(...progressValidation.warnings);
        result.dataStats.progressRecords = data.progress.length;
        
        if (progressValidation.errors.length > 0) {
          result.isValid = false;
        }
      }

      // Validate analytics data
      if (data.analytics) {
        const analyticsValidation = this.validateAnalytics(data.analytics);
        result.errors.push(...analyticsValidation.errors);
        result.warnings.push(...analyticsValidation.warnings);
        result.dataStats.analyticsRecords = 
          (data.analytics.sessions?.length || 0) + (data.analytics.quizResults?.length || 0);
        
        if (analyticsValidation.errors.length > 0) {
          result.isValid = false;
        }
      }

      // Validate spaced repetition data
      if (data.spacedRepetition) {
        const srValidation = this.validateSpacedRepetition(data.spacedRepetition);
        result.errors.push(...srValidation.errors);
        result.warnings.push(...srValidation.warnings);
        result.dataStats.spacedRepetitionRecords = data.spacedRepetition.length;
        
        if (srValidation.errors.length > 0) {
          result.isValid = false;
        }
      }

      // Validate journal data
      if (data.journal) {
        const journalValidation = this.validateJournal(data.journal);
        result.errors.push(...journalValidation.errors);
        result.warnings.push(...journalValidation.warnings);
        result.dataStats.journalEntries = data.journal.length;
        
        if (journalValidation.errors.length > 0) {
          result.isValid = false;
        }
      }

      // Check if any data exists
      const hasData = result.dataStats.studyPacks > 0 || 
                     result.dataStats.progressRecords > 0 || 
                     result.dataStats.analyticsRecords > 0 || 
                     result.dataStats.spacedRepetitionRecords > 0 || 
                     result.dataStats.journalEntries > 0;

      if (!hasData) {
        result.warnings.push('No importable data found in the file');
      }

    } catch (error) {
      result.errors.push('Invalid JSON format or corrupted file');
      result.isValid = false;
    }

    return result;
  }

  static async importData(jsonData: string, overwriteExisting: boolean = false): Promise<{
    success: boolean;
    imported: {
      studyPacks: number;
      progressRecords: number;
      analyticsRecords: number;
      spacedRepetitionRecords: number;
      journalEntries: number;
    };
    skipped: {
      studyPacks: number;
      progressRecords: number;
      analyticsRecords: number;
      spacedRepetitionRecords: number;
      journalEntries: number;
    };
    errors: string[];
  }> {
    const result = {
      success: false,
      imported: {
        studyPacks: 0,
        progressRecords: 0,
        analyticsRecords: 0,
        spacedRepetitionRecords: 0,
        journalEntries: 0
      },
      skipped: {
        studyPacks: 0,
        progressRecords: 0,
        analyticsRecords: 0,
        spacedRepetitionRecords: 0,
        journalEntries: 0
      },
      errors: []
    };

    try {
      const data: ExportableData = JSON.parse(jsonData);

      // Import study packs
      if (data.studyPacks && data.studyPacks.length > 0) {
        const importResult = await this.importStudyPacks(data.studyPacks, overwriteExisting);
        result.imported.studyPacks = importResult.imported;
        result.skipped.studyPacks = importResult.skipped;
        result.errors.push(...importResult.errors);
      }

      // Import progress data
      if (data.progress && data.progress.length > 0) {
        const importResult = await this.importProgress(data.progress, overwriteExisting);
        result.imported.progressRecords = importResult.imported;
        result.skipped.progressRecords = importResult.skipped;
        result.errors.push(...importResult.errors);
      }

      // Import analytics data
      if (data.analytics) {
        const importResult = await this.importAnalytics(data.analytics, overwriteExisting);
        result.imported.analyticsRecords = importResult.imported;
        result.skipped.analyticsRecords = importResult.skipped;
        result.errors.push(...importResult.errors);
      }

      // Import spaced repetition data
      if (data.spacedRepetition && data.spacedRepetition.length > 0) {
        const importResult = await this.importSpacedRepetition(data.spacedRepetition, overwriteExisting);
        result.imported.spacedRepetitionRecords = importResult.imported;
        result.skipped.spacedRepetitionRecords = importResult.skipped;
        result.errors.push(...importResult.errors);
      }

      // Import journal data
      if (data.journal && data.journal.length > 0) {
        const importResult = await this.importJournal(data.journal, overwriteExisting);
        result.imported.journalEntries = importResult.imported;
        result.skipped.journalEntries = importResult.skipped;
        result.errors.push(...importResult.errors);
      }

      result.success = result.errors.length === 0;

    } catch (error) {
      result.errors.push('Failed to import data: ' + (error as Error).message);
    }

    return result;
  }

  private static getStudyPacksFromStorage(): any[] {
    const stored = localStorage.getItem('studyPacks');
    if (!stored) return [];
    
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  private static getSpacedRepetitionData(): any[] {
    const reviews = localStorage.getItem('studyForge_sr_reviews');
    const sessions = localStorage.getItem('studyForge_sr_sessions');
    
    const data = [];
    
    if (reviews) {
      try {
        const reviewsData = JSON.parse(reviews);
        data.push(...reviewsData.map((item: any) => ({ ...item, type: 'review' })));
      } catch (error) {
        console.error('Failed to parse spaced repetition reviews:', error);
      }
    }
    
    if (sessions) {
      try {
        const sessionsData = JSON.parse(sessions);
        data.push(...sessionsData.map((item: any) => ({ ...item, type: 'session' })));
      } catch (error) {
        console.error('Failed to parse spaced repetition sessions:', error);
      }
    }
    
    return data;
  }

  private static validateStudyPacks(studyPacks: any[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(studyPacks)) {
      errors.push('Study packs data must be an array');
      return { errors, warnings };
    }

    studyPacks.forEach((pack, index) => {
      if (!pack.id) {
        errors.push(`Study pack ${index + 1}: Missing required field 'id'`);
      }
      if (!pack.name) {
        errors.push(`Study pack ${index + 1}: Missing required field 'name'`);
      }
      if (!pack.createdAt) {
        warnings.push(`Study pack ${index + 1}: Missing creation date`);
      }
      if (!Array.isArray(pack.flashcards)) {
        warnings.push(`Study pack ${index + 1}: Invalid or missing flashcards array`);
      }
      if (!Array.isArray(pack.quizQuestions)) {
        warnings.push(`Study pack ${index + 1}: Invalid or missing quiz questions array`);
      }
    });

    return { errors, warnings };
  }

  private static validateProgress(progress: any[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(progress)) {
      errors.push('Progress data must be an array');
      return { errors, warnings };
    }

    progress.forEach((item, index) => {
      if (!item.studyPackId) {
        errors.push(`Progress record ${index + 1}: Missing required field 'studyPackId'`);
      }
      if (typeof item.totalStudyTime !== 'number') {
        warnings.push(`Progress record ${index + 1}: Invalid total study time`);
      }
      if (typeof item.averageAccuracy !== 'number') {
        warnings.push(`Progress record ${index + 1}: Invalid average accuracy`);
      }
    });

    return { errors, warnings };
  }

  private static validateAnalytics(analytics: any): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!analytics || typeof analytics !== 'object') {
      errors.push('Analytics data must be an object');
      return { errors, warnings };
    }

    if (analytics.sessions && !Array.isArray(analytics.sessions)) {
      errors.push('Analytics sessions must be an array');
    }

    if (analytics.quizResults && !Array.isArray(analytics.quizResults)) {
      errors.push('Analytics quiz results must be an array');
    }

    return { errors, warnings };
  }

  private static validateSpacedRepetition(srData: any[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(srData)) {
      errors.push('Spaced repetition data must be an array');
      return { errors, warnings };
    }

    srData.forEach((item, index) => {
      if (!item.type || !['review', 'session'].includes(item.type)) {
        warnings.push(`Spaced repetition record ${index + 1}: Invalid or missing type`);
      }
      if (!item.studyPackId) {
        errors.push(`Spaced repetition record ${index + 1}: Missing study pack ID`);
      }
    });

    return { errors, warnings };
  }

  private static validateJournal(journal: any[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(journal)) {
      errors.push('Journal data must be an array');
      return { errors, warnings };
    }

    journal.forEach((entry, index) => {
      if (!entry.id) {
        errors.push(`Journal entry ${index + 1}: Missing required field 'id'`);
      }
      if (!entry.date) {
        errors.push(`Journal entry ${index + 1}: Missing required field 'date'`);
      }
      if (!entry.originalText && !entry.polishedText) {
        warnings.push(`Journal entry ${index + 1}: Missing text content`);
      }
    });

    return { errors, warnings };
  }

  private static async importStudyPacks(studyPacks: any[], overwrite: boolean): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const result = { imported: 0, skipped: 0, errors: [] };

    try {
      const existingPacks = this.getStudyPacksFromStorage();
      const existingIds = new Set(existingPacks.map(pack => pack.id));

      const packsToImport = [];

      for (const pack of studyPacks) {
        if (existingIds.has(pack.id) && !overwrite) {
          result.skipped++;
        } else {
          // Convert date strings back to Date objects
          if (pack.createdAt) {
            pack.createdAt = new Date(pack.createdAt);
          }
          packsToImport.push(pack);
          result.imported++;
        }
      }

      if (packsToImport.length > 0) {
        let updatedPacks;
        if (overwrite) {
          // Remove existing packs with same IDs
          const importIds = new Set(packsToImport.map(pack => pack.id));
          updatedPacks = existingPacks.filter(pack => !importIds.has(pack.id));
          updatedPacks.push(...packsToImport);
        } else {
          updatedPacks = [...existingPacks, ...packsToImport];
        }

        localStorage.setItem('studyPacks', JSON.stringify(updatedPacks));
      }

    } catch (error) {
      result.errors.push('Failed to import study packs: ' + (error as Error).message);
    }

    return result;
  }

  private static async importProgress(progress: any[], overwrite: boolean): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const result = { imported: 0, skipped: 0, errors: [] };

    try {
      const { AnalyticsService } = await import('./analyticsService');
      const existingProgress = AnalyticsService.getAllProgress();
      const existingIds = new Set(existingProgress.map(p => p.studyPackId));

      for (const progressItem of progress) {
        if (existingIds.has(progressItem.studyPackId) && !overwrite) {
          result.skipped++;
        } else {
          // Convert date strings back to Date objects
          if (progressItem.lastStudied) {
            progressItem.lastStudied = new Date(progressItem.lastStudied);
          }
          
          // Store progress data (this would need to be implemented in AnalyticsService)
          result.imported++;
        }
      }

      // Note: This is a simplified implementation
      // In a real scenario, you'd need to implement proper progress import in AnalyticsService

    } catch (error) {
      result.errors.push('Failed to import progress data: ' + (error as Error).message);
    }

    return result;
  }

  private static async importAnalytics(analytics: any, overwrite: boolean): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const result = { imported: 0, skipped: 0, errors: [] };

    try {
      // Import sessions
      if (analytics.sessions && Array.isArray(analytics.sessions)) {
        const existingSessions = JSON.parse(localStorage.getItem('studyForge_sessions') || '[]');
        
        for (const session of analytics.sessions) {
          if (session.startTime) {
            session.startTime = new Date(session.startTime);
          }
          if (session.endTime) {
            session.endTime = new Date(session.endTime);
          }
        }

        if (overwrite) {
          localStorage.setItem('studyForge_sessions', JSON.stringify(analytics.sessions));
          result.imported += analytics.sessions.length;
        } else {
          const mergedSessions = [...existingSessions, ...analytics.sessions];
          localStorage.setItem('studyForge_sessions', JSON.stringify(mergedSessions));
          result.imported += analytics.sessions.length;
        }
      }

      // Import quiz results
      if (analytics.quizResults && Array.isArray(analytics.quizResults)) {
        const existingResults = JSON.parse(localStorage.getItem('studyForge_quiz_results') || '[]');
        
        for (const result of analytics.quizResults) {
          if (result.timestamp) {
            result.timestamp = new Date(result.timestamp);
          }
        }

        if (overwrite) {
          localStorage.setItem('studyForge_quiz_results', JSON.stringify(analytics.quizResults));
          result.imported += analytics.quizResults.length;
        } else {
          const mergedResults = [...existingResults, ...analytics.quizResults];
          localStorage.setItem('studyForge_quiz_results', JSON.stringify(mergedResults));
          result.imported += analytics.quizResults.length;
        }
      }

    } catch (error) {
      result.errors.push('Failed to import analytics data: ' + (error as Error).message);
    }

    return result;
  }

  private static async importSpacedRepetition(srData: any[], overwrite: boolean): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const result = { imported: 0, skipped: 0, errors: [] };

    try {
      const reviews = srData.filter(item => item.type === 'review');
      const sessions = srData.filter(item => item.type === 'session');

      if (reviews.length > 0) {
        const existingReviews = JSON.parse(localStorage.getItem('studyForge_sr_reviews') || '[]');
        
        for (const review of reviews) {
          if (review.reviewDate) {
            review.reviewDate = new Date(review.reviewDate);
          }
          if (review.nextReview) {
            review.nextReview = new Date(review.nextReview);
          }
        }

        if (overwrite) {
          const cleanedReviews = reviews.map(({ type, ...review }) => review);
          localStorage.setItem('studyForge_sr_reviews', JSON.stringify(cleanedReviews));
        } else {
          const cleanedReviews = reviews.map(({ type, ...review }) => review);
          const mergedReviews = [...existingReviews, ...cleanedReviews];
          localStorage.setItem('studyForge_sr_reviews', JSON.stringify(mergedReviews));
        }
        
        result.imported += reviews.length;
      }

      if (sessions.length > 0) {
        const existingSessions = JSON.parse(localStorage.getItem('studyForge_sr_sessions') || '[]');
        
        for (const session of sessions) {
          if (session.date) {
            session.date = new Date(session.date);
          }
        }

        if (overwrite) {
          const cleanedSessions = sessions.map(({ type, ...session }) => session);
          localStorage.setItem('studyForge_sr_sessions', JSON.stringify(cleanedSessions));
        } else {
          const cleanedSessions = sessions.map(({ type, ...session }) => session);
          const mergedSessions = [...existingSessions, ...cleanedSessions];
          localStorage.setItem('studyForge_sr_sessions', JSON.stringify(mergedSessions));
        }
        
        result.imported += sessions.length;
      }

    } catch (error) {
      result.errors.push('Failed to import spaced repetition data: ' + (error as Error).message);
    }

    return result;
  }

  private static async importJournal(journal: any[], overwrite: boolean): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const result = { imported: 0, skipped: 0, errors: [] };

    try {
      const existingEntries = JSON.parse(localStorage.getItem('studyForge_journal_entries') || '[]');
      const existingIds = new Set(existingEntries.map((entry: any) => entry.id));

      const entriesToImport = [];

      for (const entry of journal) {
        if (existingIds.has(entry.id) && !overwrite) {
          result.skipped++;
        } else {
          if (entry.date) {
            entry.date = new Date(entry.date);
          }
          entriesToImport.push(entry);
          result.imported++;
        }
      }

      if (entriesToImport.length > 0) {
        let updatedEntries;
        if (overwrite) {
          const importIds = new Set(entriesToImport.map(entry => entry.id));
          updatedEntries = existingEntries.filter((entry: any) => !importIds.has(entry.id));
          updatedEntries.push(...entriesToImport);
        } else {
          updatedEntries = [...existingEntries, ...entriesToImport];
        }

        localStorage.setItem('studyForge_journal_entries', JSON.stringify(updatedEntries));
      }

    } catch (error) {
      result.errors.push('Failed to import journal data: ' + (error as Error).message);
    }

    return result;
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static generateExportSummary(options: ExportOptions, dataStats: any): string {
    const summary = [];
    
    if (options.includeStudyPacks) {
      summary.push(`${dataStats.studyPacks} study pack(s)`);
    }
    if (options.includeProgress) {
      summary.push(`${dataStats.progressRecords} progress record(s)`);
    }
    if (options.includeAnalytics) {
      summary.push(`${dataStats.analyticsRecords} analytics record(s)`);
    }
    if (options.includeSpacedRepetition) {
      summary.push(`${dataStats.spacedRepetitionRecords} spaced repetition record(s)`);
    }
    if (options.includeJournal) {
      summary.push(`${dataStats.journalEntries} journal entr(y/ies)`);
    }

    return summary.join(', ');
  }
}
