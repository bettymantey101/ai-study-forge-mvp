export interface ParsedSection {
  title: string;
  content: string;
  level: number;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface ParseTextResponse {
  sections: ParsedSection[];
  rawText: string;
  wordCount: number;
}

export interface GenerateFlashcardsResponse {
  flashcards: Flashcard[];
}

export interface GenerateQuizResponse {
  questions: QuizQuestion[];
}

export class TextProcessor {
  static parseText(text: string, fileName: string): ParseTextResponse {
    const sections = this.extractSections(text);
    
    return {
      sections,
      rawText: text,
      wordCount: text.split(/\s+/).length
    };
  }

  static generateFlashcards(text: string, maxCards: number = 20): GenerateFlashcardsResponse {
    const flashcards = this.extractFlashcards(text, maxCards);
    return { flashcards };
  }

  static generateQuiz(text: string, questionCount: number = 10): GenerateQuizResponse {
    const questions = this.generateQuizQuestions(text, questionCount);
    return { questions };
  }

  private static extractSections(text: string): ParsedSection[] {
    const lines = text.split('\n');
    const sections: ParsedSection[] = [];
    let currentSection: ParsedSection | null = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) continue;
      
      const isHeader = this.isLikelyHeader(trimmedLine, lines);
      
      if (isHeader) {
        if (currentSection) {
          sections.push(currentSection);
        }
        
        currentSection = {
          title: trimmedLine.replace(/^#+\s*/, ''),
          content: '',
          level: this.getHeaderLevel(trimmedLine)
        };
      } else if (currentSection) {
        currentSection.content += (currentSection.content ? '\n' : '') + trimmedLine;
      } else {
        currentSection = {
          title: 'Introduction',
          content: trimmedLine,
          level: 1
        };
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    if (sections.length === 0) {
      sections.push({
        title: 'Content',
        content: text,
        level: 1
      });
    }
    
    return sections;
  }

  private static isLikelyHeader(line: string, allLines: string[]): boolean {
    if (line.startsWith('#')) return true;
    if (line === line.toUpperCase() && line.length < 50) return true;
    if (line.length < 60 && !line.endsWith('.') && !line.endsWith(',')) {
      return true;
    }
    return false;
  }

  private static getHeaderLevel(line: string): number {
    const match = line.match(/^#+/);
    return match ? match[0].length : 1;
  }

  private static extractFlashcards(text: string, maxCards: number): Flashcard[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const flashcards: Flashcard[] = [];
    
    const keywords = this.extractKeywords(text);
    
    for (let i = 0; i < Math.min(sentences.length, maxCards); i++) {
      const sentence = sentences[i].trim();
      
      if (sentence.length < 20) continue;
      
      const questionType = i % 3;
      let question: string;
      let answer: string;
      
      if (questionType === 0 && keywords.length > i) {
        const keyword = keywords[i];
        question = `What is ${keyword}?`;
        answer = this.findDefinition(text, keyword) || sentence;
      } else if (questionType === 1) {
        const words = sentence.split(' ');
        if (words.length > 5) {
          const blankIndex = Math.floor(words.length / 2);
          const blankWord = words[blankIndex];
          words[blankIndex] = '______';
          question = `Fill in the blank: ${words.join(' ')}`;
          answer = blankWord;
        } else {
          question = `Explain: ${sentence.substring(0, 50)}...`;
          answer = sentence;
        }
      } else {
        question = `True or False: ${sentence}`;
        answer = 'True (assuming the statement is factual from the source material)';
      }
      
      flashcards.push({
        id: `card_${i + 1}`,
        question,
        answer,
        difficulty: i % 3 === 0 ? 'easy' : i % 3 === 1 ? 'medium' : 'hard'
      });
    }
    
    return flashcards;
  }

  private static extractKeywords(text: string): string[] {
    const words = text.split(/\s+/);
    const keywords: string[] = [];
    
    for (const word of words) {
      const cleaned = word.replace(/[^\w]/g, '');
      if (cleaned.length > 3 && 
          (cleaned[0] === cleaned[0].toUpperCase() || 
           this.isImportantTerm(cleaned.toLowerCase()))) {
        keywords.push(cleaned);
      }
    }
    
    return [...new Set(keywords)].slice(0, 10);
  }

  private static isImportantTerm(word: string): boolean {
    const importantTerms = [
      'definition', 'concept', 'theory', 'principle', 'method', 'process',
      'analysis', 'research', 'study', 'data', 'result', 'conclusion',
      'important', 'significant', 'key', 'main', 'primary', 'essential'
    ];
    return importantTerms.includes(word);
  }

  private static findDefinition(text: string, keyword: string): string | null {
    const sentences = text.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(keyword.toLowerCase()) && 
          (sentence.toLowerCase().includes('is') || 
           sentence.toLowerCase().includes('means') ||
           sentence.toLowerCase().includes('refers to'))) {
        return sentence.trim();
      }
    }
    
    return null;
  }

  private static generateQuizQuestions(text: string, count: number): QuizQuestion[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const questions: QuizQuestion[] = [];
    
    for (let i = 0; i < Math.min(sentences.length, count); i++) {
      const sentence = sentences[i].trim();
      
      const words = sentence.split(' ');
      const keywords = words.filter(w => w.length > 3 && /^[A-Z]/.test(w));
      
      if (keywords.length === 0) continue;
      
      const correctKeyword = keywords[0];
      const question = sentence.replace(correctKeyword, '______');
      
      const distractors = this.generateDistractors(correctKeyword, text);
      const options = [correctKeyword, ...distractors].slice(0, 4);
      
      const correctIndex = Math.floor(Math.random() * options.length);
      const shuffledOptions = [...options];
      shuffledOptions[correctIndex] = correctKeyword;
      shuffledOptions[0] = options[correctIndex];
      
      questions.push({
        id: `quiz_${i + 1}`,
        question: `What word completes this statement: ${question}`,
        options: shuffledOptions,
        correctAnswer: correctIndex,
        explanation: `The correct answer is "${correctKeyword}" based on the source material.`
      });
    }
    
    return questions;
  }

  private static generateDistractors(correctAnswer: string, text: string): string[] {
    const words = text.split(/\s+/);
    const candidates = words
      .filter(w => w.length > 3 && /^[A-Z]/.test(w) && w !== correctAnswer)
      .filter((w, i, arr) => arr.indexOf(w) === i)
      .slice(0, 10);
    
    const genericDistractors = [
      'Analysis', 'Research', 'Theory', 'Method', 'Process', 'System',
      'Concept', 'Principle', 'Data', 'Result', 'Study', 'Information'
    ];
    
    const allDistractors = [...candidates, ...genericDistractors]
      .filter(d => d !== correctAnswer)
      .slice(0, 3);
    
    return allDistractors;
  }
}
