export interface VectorEmbedding {
  id: string;
  vector: number[];
  text: string;
  metadata: {
    sectionTitle?: string;
    difficulty?: string;
    type: 'flashcard' | 'quiz' | 'section';
  };
}

export class EmbeddingService {
  private static readonly DB_NAME = 'StudyForgeDB';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'embeddings';
  
  private static async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('studyPackId', 'studyPackId', { unique: false });
        }
      };
    });
  }

  static async generateEmbedding(text: string): Promise<number[]> {
    // Simple word-based embedding using TF-IDF approach
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const uniqueWords = [...new Set(words)];
    
    // Create a simple vector representation
    const vector = new Array(100).fill(0);
    
    for (let i = 0; i < uniqueWords.length && i < 100; i++) {
      const word = uniqueWords[i];
      const frequency = words.filter(w => w === word).length / words.length;
      vector[i] = frequency * Math.log(words.length / frequency);
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  static async storeEmbeddings(studyPackId: string, embeddings: VectorEmbedding[]): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    
    for (const embedding of embeddings) {
      await store.put({ ...embedding, studyPackId });
    }
    
    await new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(void 0);
      transaction.onerror = () => reject(transaction.error);
    });
    
    db.close();
  }

  static async getEmbeddings(studyPackId: string): Promise<VectorEmbedding[]> {
    const db = await this.openDB();
    const transaction = db.transaction([this.STORE_NAME], 'readonly');
    const store = transaction.objectStore(this.STORE_NAME);
    const index = store.index('studyPackId');
    
    const embeddings: VectorEmbedding[] = [];
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only(studyPackId));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          embeddings.push(cursor.value);
          cursor.continue();
        } else {
          resolve(embeddings);
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  static async deleteEmbeddings(studyPackId: string): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);
    const index = store.index('studyPackId');
    
    return new Promise((resolve, reject) => {
      const request = index.openCursor(IDBKeyRange.only(studyPackId));
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  static async findSimilar(studyPackId: string, queryVector: number[], limit: number = 5): Promise<VectorEmbedding[]> {
    const embeddings = await this.getEmbeddings(studyPackId);
    
    const similarities = embeddings.map(embedding => ({
      embedding,
      similarity: this.cosineSimilarity(queryVector, embedding.vector)
    }));
    
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.embedding);
  }
}
