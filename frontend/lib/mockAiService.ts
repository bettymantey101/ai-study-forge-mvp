export class MockAIService {
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async polishText(text: string): Promise<string> {
    // Simulate AI processing time
    await this.delay(1000 + Math.random() * 2000);

    // Simple text improvements
    let polished = text;

    // Basic grammar improvements
    polished = polished.replace(/\bi\b/g, 'I');
    polished = polished.replace(/\bim\b/gi, "I'm");
    polished = polished.replace(/\bdont\b/gi, "don't");
    polished = polished.replace(/\bcant\b/gi, "can't");
    polished = polished.replace(/\bwont\b/gi, "won't");
    polished = polished.replace(/\bits\b/gi, "it's");
    polished = polished.replace(/\byour\b/gi, "you're");

    // Improve sentence structure
    polished = polished.replace(/\band and\b/gi, 'and');
    polished = polished.replace(/\bbut but\b/gi, 'but');
    polished = polished.replace(/\bso so\b/gi, 'so');

    // Add variety to sentence starters
    polished = polished.replace(/^I think /gm, Math.random() > 0.5 ? 'I believe ' : 'In my opinion, ');
    polished = polished.replace(/^I learned /gm, Math.random() > 0.5 ? 'I discovered ' : 'I gained insight into ');
    polished = polished.replace(/^I feel /gm, Math.random() > 0.5 ? 'I sense ' : 'I have the feeling ');

    // Enhance vocabulary
    const improvements = [
      { from: /\bgood\b/gi, to: ['excellent', 'wonderful', 'remarkable', 'impressive'] },
      { from: /\bbad\b/gi, to: ['challenging', 'difficult', 'problematic', 'concerning'] },
      { from: /\binteresting\b/gi, to: ['fascinating', 'intriguing', 'captivating', 'engaging'] },
      { from: /\blearned\b/gi, to: ['discovered', 'gained insight into', 'understood', 'absorbed'] },
      { from: /\bhard\b/gi, to: ['challenging', 'demanding', 'complex', 'intricate'] },
      { from: /\beasy\b/gi, to: ['straightforward', 'manageable', 'accessible', 'clear'] },
      { from: /\bfun\b/gi, to: ['enjoyable', 'engaging', 'delightful', 'rewarding'] },
      { from: /\bconfused\b/gi, to: ['puzzled', 'uncertain', 'perplexed', 'unclear'] }
    ];

    improvements.forEach(({ from, to }) => {
      polished = polished.replace(from, () => to[Math.floor(Math.random() * to.length)]);
    });

    // Improve transitions
    polished = polished.replace(/\. Then /g, '. Subsequently, ');
    polished = polished.replace(/\. Also /g, '. Additionally, ');
    polished = polished.replace(/\. But /g, '. However, ');

    // Fix capitalization
    polished = polished.charAt(0).toUpperCase() + polished.slice(1);
    polished = polished.replace(/\. ([a-z])/g, (match, letter) => '. ' + letter.toUpperCase());

    // Ensure proper ending
    if (!polished.match(/[.!?]$/)) {
      polished += '.';
    }

    // Clean up extra spaces
    polished = polished.replace(/\s+/g, ' ').trim();

    return polished;
  }

  static async summarizeContent(content: string[]): Promise<string> {
    // Simulate AI processing time
    await this.delay(1500 + Math.random() * 1500);

    if (content.length === 0) {
      return "Today was a quiet day in your learning journey. Every expert was once a beginner!";
    }

    const templates = [
      "Today's learning session showcased remarkable growth as you engaged with {topics}. Your dedication to understanding these concepts demonstrates genuine intellectual curiosity.",
      "Your study journey today reflected deep engagement with {topics}. The consistent effort you're putting into mastering these areas is truly commendable.",
      "Today you explored {topics} with focused attention and thoughtful reflection. This kind of deliberate practice is the foundation of lasting knowledge.",
      "Your learning adventure today covered {topics}, showing your commitment to continuous improvement. Each session builds upon the last, creating a strong foundation.",
      "Today's educational exploration into {topics} demonstrates your evolving expertise. The patterns of growth in your study habits are becoming increasingly evident."
    ];

    // Extract key themes from content
    const themes = this.extractThemes(content);
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    return template.replace('{topics}', themes);
  }

  private static extractThemes(content: string[]): string {
    const commonWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'
    ]);

    const allWords = content.join(' ').toLowerCase().split(/\W+/);
    const significantWords = allWords.filter(word => 
      word.length > 3 && !commonWords.has(word)
    );

    const wordCounts = significantWords.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topWords = Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([word]) => word);

    if (topWords.length === 0) {
      return "various fascinating topics";
    } else if (topWords.length === 1) {
      return topWords[0];
    } else if (topWords.length === 2) {
      return `${topWords[0]} and ${topWords[1]}`;
    } else {
      return `${topWords.slice(0, -1).join(', ')}, and ${topWords[topWords.length - 1]}`;
    }
  }
}
