import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface StudyPack {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileContent: string; // Store content locally instead of fileId
  createdAt: Date;
  wordCount: number;
  sections: ParsedSection[];
  flashcards: Flashcard[];
  quizQuestions: QuizQuestion[];
}

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

interface StudyPackContextType {
  studyPacks: StudyPack[];
  addStudyPack: (studyPack: StudyPack) => void;
  removeStudyPack: (id: string) => void;
  getStudyPack: (id: string) => StudyPack | undefined;
}

const StudyPackContext = createContext<StudyPackContextType | undefined>(undefined);

export function StudyPackProvider({ children }: { children: ReactNode }) {
  const [studyPacks, setStudyPacks] = useState<StudyPack[]>([]);

  // Load study packs from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('studyPacks');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects and handle old format
        const studyPacksWithDates = parsed.map((pack: any) => ({
          ...pack,
          createdAt: new Date(pack.createdAt),
          // Handle legacy packs that might not have fileContent
          fileContent: pack.fileContent || ''
        }));
        setStudyPacks(studyPacksWithDates);
      } catch (error) {
        console.error('Failed to parse stored study packs:', error);
      }
    }
  }, []);

  // Save study packs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('studyPacks', JSON.stringify(studyPacks));
  }, [studyPacks]);

  const addStudyPack = (studyPack: StudyPack) => {
    setStudyPacks(prev => [studyPack, ...prev]);
  };

  const removeStudyPack = (id: string) => {
    setStudyPacks(prev => prev.filter(pack => pack.id !== id));
  };

  const getStudyPack = (id: string) => {
    return studyPacks.find(pack => pack.id === id);
  };

  return (
    <StudyPackContext.Provider value={{
      studyPacks,
      addStudyPack,
      removeStudyPack,
      getStudyPack
    }}>
      {children}
    </StudyPackContext.Provider>
  );
}

export function useStudyPacks() {
  const context = useContext(StudyPackContext);
  if (!context) {
    throw new Error('useStudyPacks must be used within a StudyPackProvider');
  }
  return context;
}
