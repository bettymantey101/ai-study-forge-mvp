import { EmbeddingService } from './embeddingService';
import type { StudyPack } from '../context/StudyPackContext';

export interface SearchResult {
  id: string;
  text: string;
  type: 'flashcard' | 'quiz' | 'section';
  studyPackId: string;
  studyPackName: string;
  score: number;
  metadata: any;
}

export class SearchService {
  static async search(query: string, studyPacks: StudyPack[], limit: number = 10): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    const queryVector = await EmbeddingService.generateEmbedding(query);
    const allResults: SearchResult[] = [];

    for (const studyPack of studyPacks) {
      try {
        const embeddings = await EmbeddingService.getEmbeddings(studyPack.id);
        
        for (const embedding of embeddings) {
          const similarity = EmbeddingService.cosineSimilarity(queryVector, embedding.vector);
          
          if (similarity > 0.1) { // Minimum similarity threshold
            allResults.push({
              id: embedding.id,
              text: embedding.text,
              type: embedding.metadata.type,
              studyPackId: studyPack.id,
              studyPackName: studyPack.name,
              score: similarity,
              metadata: embedding.metadata
            });
          }
        }
      } catch (error) {
        console.error(`Failed to search in study pack ${studyPack.id}:`, error);
      }
    }

    // Sort by similarity score and return top results
    return allResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  static async searchInStudyPack(query: string, studyPackId: string, limit: number = 5): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    const queryVector = await EmbeddingService.generateEmbedding(query);
    const embeddings = await EmbeddingService.getEmbeddings(studyPackId);
    const results: SearchResult[] = [];

    for (const embedding of embeddings) {
      const similarity = EmbeddingService.cosineSimilarity(queryVector, embedding.vector);
      
      if (similarity > 0.1) {
        results.push({
          id: embedding.id,
          text: embedding.text,
          type: embedding.metadata.type,
          studyPackId,
          studyPackName: '',
          score: similarity,
          metadata: embedding.metadata
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  static async findSimilarContent(studyPackId: string, content: string, limit: number = 3): Promise<SearchResult[]> {
    const contentVector = await EmbeddingService.generateEmbedding(content);
    const embeddings = await EmbeddingService.getEmbeddings(studyPackId);
    const results: SearchResult[] = [];

    for (const embedding of embeddings) {
      const similarity = EmbeddingService.cosineSimilarity(contentVector, embedding.vector);
      
      if (similarity > 0.2) {
        results.push({
          id: embedding.id,
          text: embedding.text,
          type: embedding.metadata.type,
          studyPackId,
          studyPackName: '',
          score: similarity,
          metadata: embedding.metadata
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
