import type { ParsedSection } from '../context/StudyPackContext';

export interface Mnemonic {
  concept: string;
  mnemonic: string;
  type: 'acronym' | 'rhyme' | 'story' | 'visual';
  explanation: string;
}

export interface Summaries {
  bullet: string;
  simple: string;
  paragraph: string;
  mnemonics: Mnemonic[];
}

export class SummaryService {
  static async generateSummaries(content: string, sections: ParsedSection[]): Promise<Summaries> {
    const bullet = this.generateBulletSummary(content, sections);
    const simple = this.generateSimpleSummary(content);
    const paragraph = this.generateParagraphSummary(content);
    const mnemonics = this.generateMnemonics(content, sections);

    return {
      bullet,
      simple,
      paragraph,
      mnemonics
    };
  }

  private static generateBulletSummary(content: string, sections: ParsedSection[]): string {
    const points: string[] = [];
    
    if (sections.length > 0) {
      sections.forEach(section => {
        if (section.title && section.title !== 'Introduction' && section.title !== 'Content') {
          points.push(`• ${section.title}`);
          
          const sentences = section.content.split(/[.!?]+/).filter(s => s.trim().length > 20);
          const keyPoints = sentences.slice(0, 2).map(s => s.trim());
          keyPoints.forEach(point => {
            if (point) {
              points.push(`  - ${point}`);
            }
          });
        }
      });
    } else {
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
      const keyPoints = sentences.slice(0, 8);
      keyPoints.forEach(point => {
        if (point.trim()) {
          points.push(`• ${point.trim()}`);
        }
      });
    }

    return points.join('\n');
  }

  private static generateSimpleSummary(content: string): string {
    const words = content.split(/\s+/);
    const wordCount = words.length;
    
    if (wordCount < 100) {
      return "This is a short text that explains some important ideas. The main points are covered in simple terms that are easy to understand.";
    }

    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const keySentences = sentences.slice(0, 3);
    
    const simplifiedSentences = keySentences.map(sentence => {
      const simplified = sentence
        .replace(/\b(furthermore|moreover|consequently|therefore|thus|hence)\b/gi, 'so')
        .replace(/\b(utilize|employ)\b/gi, 'use')
        .replace(/\b(demonstrate|illustrate)\b/gi, 'show')
        .replace(/\b(subsequently|thereafter)\b/gi, 'then')
        .replace(/\b(acquire|obtain)\b/gi, 'get')
        .replace(/\b(significant|substantial)\b/gi, 'important')
        .replace(/\b(facilitate|enable)\b/gi, 'help')
        .trim();
      
      return simplified.charAt(0).toUpperCase() + simplified.slice(1);
    });

    return `Here's what this is all about: ${simplifiedSentences.join('. ')}. Think of it like building blocks - each idea connects to the next one to help you understand the bigger picture.`;
  }

  private static generateParagraphSummary(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
    const wordCount = content.split(/\s+/).length;
    
    let summaryLength;
    if (wordCount < 500) summaryLength = 3;
    else if (wordCount < 1000) summaryLength = 4;
    else summaryLength = 5;
    
    const keySentences = sentences.slice(0, summaryLength);
    const summary = keySentences.map(s => s.trim()).join('. ') + '.';
    
    return summary.replace(/\s+/g, ' ').trim();
  }

  private static generateMnemonics(content: string, sections: ParsedSection[]): Mnemonic[] {
    const mnemonics: Mnemonic[] = [];
    const keywords = this.extractKeywords(content);
    const concepts = this.extractConcepts(content, sections);

    // Generate acronym mnemonics
    concepts.slice(0, 2).forEach(concept => {
      const words = concept.split(/\s+/).filter(w => w.length > 2);
      if (words.length >= 3) {
        const acronym = words.map(w => w[0].toUpperCase()).join('');
        const story = this.createAcronymStory(words, acronym);
        mnemonics.push({
          concept,
          mnemonic: `${acronym}: ${story}`,
          type: 'acronym',
          explanation: `Remember the key parts of "${concept}" using this acronym.`
        });
      }
    });

    // Generate rhyme mnemonics
    keywords.slice(0, 2).forEach(keyword => {
      const rhyme = this.createRhyme(keyword);
      if (rhyme) {
        mnemonics.push({
          concept: keyword,
          mnemonic: rhyme,
          type: 'rhyme',
          explanation: `A simple rhyme to remember "${keyword}".`
        });
      }
    });

    // Generate story mnemonics
    if (concepts.length > 0) {
      const mainConcept = concepts[0];
      const relatedWords = keywords.slice(0, 3);
      const story = this.createStoryMnemonic(mainConcept, relatedWords);
      mnemonics.push({
        concept: mainConcept,
        mnemonic: story,
        type: 'story',
        explanation: `A memorable story connecting the key elements of "${mainConcept}".`
      });
    }

    return mnemonics;
  }

  private static extractKeywords(content: string): string[] {
    const words = content.split(/\s+/);
    const keywords: string[] = [];
    
    for (const word of words) {
      const cleaned = word.replace(/[^\w]/g, '');
      if (cleaned.length > 4 && 
          (cleaned[0] === cleaned[0].toUpperCase() || 
           this.isImportantTerm(cleaned.toLowerCase()))) {
        keywords.push(cleaned);
      }
    }
    
    return [...new Set(keywords)].slice(0, 6);
  }

  private static extractConcepts(content: string, sections: ParsedSection[]): string[] {
    const concepts: string[] = [];
    
    sections.forEach(section => {
      if (section.title && section.title !== 'Introduction' && section.title !== 'Content') {
        concepts.push(section.title);
      }
    });
    
    if (concepts.length === 0) {
      const sentences = content.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (sentence.includes(' is ') || sentence.includes(' are ') || sentence.includes(' means ')) {
          const words = sentence.split(' ');
          const conceptIndex = Math.max(
            words.findIndex(w => w.toLowerCase() === 'is'),
            words.findIndex(w => w.toLowerCase() === 'are'),
            words.findIndex(w => w.toLowerCase() === 'means')
          );
          if (conceptIndex > 0) {
            const concept = words.slice(Math.max(0, conceptIndex - 3), conceptIndex).join(' ').trim();
            if (concept.length > 5) {
              concepts.push(concept);
            }
          }
        }
      }
    }
    
    return concepts.slice(0, 3);
  }

  private static createAcronymStory(words: string[], acronym: string): string {
    const storyWords = words.map(word => {
      const alternatives: { [key: string]: string[] } = {
        'analysis': ['Amazing', 'Awesome', 'Active'],
        'research': ['Rapid', 'Reliable', 'Robust'],
        'study': ['Super', 'Smart', 'Strong'],
        'data': ['Dynamic', 'Detailed', 'Direct'],
        'method': ['Mighty', 'Modern', 'Magic'],
        'process': ['Powerful', 'Perfect', 'Practical'],
        'system': ['Simple', 'Smooth', 'Smart'],
        'theory': ['Thoughtful', 'Timely', 'True']
      };
      
      const key = word.toLowerCase();
      if (alternatives[key]) {
        return alternatives[key][0];
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    });
    
    return storyWords.join(' ');
  }

  private static createRhyme(keyword: string): string | null {
    const rhymes: { [key: string]: string } = {
      'data': 'Data, data everywhere, handle it with care!',
      'study': 'Study steady, be ready!',
      'research': 'Research with purpose, worth the purchase!',
      'analysis': 'Analysis is the key, helping you see clearly!',
      'method': 'Method planned, success in hand!',
      'theory': 'Theory clear, keeps you near the answer!',
      'process': 'Process smooth, helps you groove!',
      'system': 'System strong, helps along!'
    };
    
    const key = keyword.toLowerCase();
    return rhymes[key] || null;
  }

  private static createStoryMnemonic(concept: string, keywords: string[]): string {
    const characters = ['Alex', 'Sam', 'Jordan', 'Taylor'];
    const actions = ['discovered', 'explored', 'analyzed', 'investigated'];
    const places = ['the library', 'the lab', 'the field', 'the office'];
    
    const character = characters[Math.floor(Math.random() * characters.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const place = places[Math.floor(Math.random() * places.length)];
    
    const keywordList = keywords.slice(0, 3).join(', ');
    
    return `Imagine ${character} ${action} ${concept} in ${place}. They found that ${keywordList} were the most important elements to remember.`;
  }

  private static isImportantTerm(word: string): boolean {
    const importantTerms = [
      'definition', 'concept', 'theory', 'principle', 'method', 'process',
      'analysis', 'research', 'study', 'data', 'result', 'conclusion',
      'important', 'significant', 'key', 'main', 'primary', 'essential',
      'system', 'model', 'framework', 'approach', 'strategy', 'technique'
    ];
    return importantTerms.includes(word);
  }
}
