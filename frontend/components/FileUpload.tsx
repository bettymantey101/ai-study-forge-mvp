import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useStudyPacks } from '../context/StudyPackContext';
import { TextProcessor } from '../lib/textProcessor';
import { EmbeddingService } from '../lib/embeddingService';
import type { StudyPack } from '../context/StudyPackContext';

interface FileUploadProps {
  onClose: () => void;
}

export default function FileUpload({ onClose }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { addStudyPack } = useStudyPacks();
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    await processFile(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const processFile = async (file: File) => {
    try {
      setUploading(true);
      setProgress(0);

      // Read file content
      const content = await readFileContent(file);
      setProgress(20);

      // Parse text locally
      const parseResponse = TextProcessor.parseText(content, file.name);
      setProgress(40);

      // Generate flashcards locally
      const flashcardsResponse = TextProcessor.generateFlashcards(content, 20);
      setProgress(60);

      // Generate quiz locally
      const quizResponse = TextProcessor.generateQuiz(content, 10);
      setProgress(80);

      // Generate embeddings
      const embeddings = await generateEmbeddings(parseResponse, flashcardsResponse, quizResponse);
      setProgress(90);

      // Create study pack
      const studyPackId = `pack_${Date.now()}`;
      const studyPack: StudyPack = {
        id: studyPackId,
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        fileName: file.name,
        fileType: file.type,
        fileContent: content, // Store content locally
        createdAt: new Date(),
        wordCount: parseResponse.wordCount,
        sections: parseResponse.sections,
        flashcards: flashcardsResponse.flashcards,
        quizQuestions: quizResponse.questions
      };

      // Store embeddings in IndexedDB
      await EmbeddingService.storeEmbeddings(studyPackId, embeddings);
      setProgress(100);

      addStudyPack(studyPack);

      toast({
        title: "Study pack created!",
        description: `Successfully processed ${file.name} with ${flashcardsResponse.flashcards.length} flashcards and ${quizResponse.questions.length} quiz questions.`
      });

      onClose();

    } catch (error) {
      console.error('Failed to process file:', error);
      toast({
        title: "Upload failed",
        description: "There was an error processing your file. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file content'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const generateEmbeddings = async (parseResponse: any, flashcardsResponse: any, quizResponse: any) => {
    const embeddings = [];

    // Generate embeddings for sections
    for (const section of parseResponse.sections) {
      const vector = await EmbeddingService.generateEmbedding(section.content);
      embeddings.push({
        id: `section_${section.title}`,
        vector,
        text: section.content,
        metadata: {
          sectionTitle: section.title,
          type: 'section' as const
        }
      });
    }

    // Generate embeddings for flashcards
    for (const flashcard of flashcardsResponse.flashcards) {
      const vector = await EmbeddingService.generateEmbedding(`${flashcard.question} ${flashcard.answer}`);
      embeddings.push({
        id: flashcard.id,
        vector,
        text: `${flashcard.question} ${flashcard.answer}`,
        metadata: {
          difficulty: flashcard.difficulty,
          type: 'flashcard' as const
        }
      });
    }

    // Generate embeddings for quiz questions
    for (const question of quizResponse.questions) {
      const vector = await EmbeddingService.generateEmbedding(`${question.question} ${question.options.join(' ')}`);
      embeddings.push({
        id: question.id,
        vector,
        text: `${question.question} ${question.options.join(' ')}`,
        metadata: {
          type: 'quiz' as const
        }
      });
    }

    return embeddings;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Upload Study Material</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {uploading ? (
          <div className="text-center py-8">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Processing your file...</h3>
            <p className="text-muted-foreground mb-4">
              Extracting text, generating flashcards, quiz questions, and vector embeddings
            </p>
            <Progress value={progress} className="max-w-md mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">{progress}% complete</p>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            {isDragActive ? (
              <p className="text-lg">Drop your file here...</p>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">
                  Drop your file here or click to browse
                </h3>
                <p className="text-muted-foreground mb-4">
                  Supports PDF, TXT, and Markdown files (max 10MB)
                </p>
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Choose File
                </Button>
              </>
            )}
          </div>
        )}

        <div className="mt-4 p-4 bg-muted rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Privacy Notice</p>
              <p>
                All processing happens locally in your browser. Your files and generated 
                study materials are stored locally and never sent to external servers.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
