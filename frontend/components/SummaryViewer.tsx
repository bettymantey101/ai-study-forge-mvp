import React, { useState, useEffect } from 'react';
import { FileText, Lightbulb, BookOpen, Volume2, VolumeX, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AudioService } from '../lib/audioService';
import { SummaryService } from '../lib/summaryService';
import type { StudyPack } from '../context/StudyPackContext';

interface SummaryViewerProps {
  studyPack: StudyPack;
}

export default function SummaryViewer({ studyPack }: SummaryViewerProps) {
  const [summaries, setSummaries] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioElements, setAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    generateSummaries();
  }, [studyPack]);

  useEffect(() => {
    return () => {
      // Cleanup audio elements
      audioElements.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [audioElements]);

  const generateSummaries = async () => {
    setGenerating(true);
    try {
      const newSummaries = await SummaryService.generateSummaries(studyPack.fileContent, studyPack.sections);
      setSummaries(newSummaries);
    } catch (error) {
      console.error('Failed to generate summaries:', error);
    } finally {
      setGenerating(false);
    }
  };

  const playAudio = async (text: string, type: string) => {
    try {
      const audioKey = `${type}_audio`;
      
      if (audioPlaying === audioKey) {
        // Stop current audio
        const audio = audioElements.get(audioKey);
        if (audio) {
          audio.pause();
          setAudioPlaying(null);
          setAudioProgress(0);
        }
        return;
      }

      // Stop any currently playing audio
      audioElements.forEach((audio, key) => {
        if (audioPlaying === key) {
          audio.pause();
        }
      });

      setAudioPlaying(audioKey);
      
      let audio = audioElements.get(audioKey);
      if (!audio) {
        const audioBlob = await AudioService.textToSpeech(text);
        const audioUrl = URL.createObjectURL(audioBlob);
        audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setAudioPlaying(null);
          setAudioProgress(0);
        };
        
        audio.ontimeupdate = () => {
          if (audio) {
            const progress = (audio.currentTime / audio.duration) * 100;
            setAudioProgress(progress);
          }
        };
        
        setAudioElements(prev => new Map(prev.set(audioKey, audio!)));
      }
      
      await audio.play();
    } catch (error) {
      console.error('Failed to play audio:', error);
      setAudioPlaying(null);
    }
  };

  const downloadAudio = async (text: string, filename: string) => {
    try {
      const audioBlob = await AudioService.textToSpeech(text);
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download audio:', error);
    }
  };

  if (generating) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Generating Summaries...
              </h3>
              <p className="text-muted-foreground">
                Creating different summary formats for your study material
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!summaries) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Summaries Available
              </h3>
              <p className="text-muted-foreground mb-4">
                Failed to generate summaries for this study pack.
              </p>
              <Button onClick={generateSummaries}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground mb-2">Summaries</h2>
        <p className="text-muted-foreground">
          Different formats to help you understand and remember the key concepts
        </p>
      </div>

      <Tabs defaultValue="bullet" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="bullet" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Bullet Points</span>
          </TabsTrigger>
          <TabsTrigger value="simple" className="flex items-center space-x-2">
            <Lightbulb className="h-4 w-4" />
            <span>Simple</span>
          </TabsTrigger>
          <TabsTrigger value="paragraph" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>Paragraph</span>
          </TabsTrigger>
          <TabsTrigger value="mnemonics" className="flex items-center space-x-2">
            <span>🧠</span>
            <span>Mnemonics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bullet">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Bullet Point Summary</span>
              </CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => playAudio(summaries.bullet, 'bullet')}
                >
                  {audioPlaying === 'bullet_audio' ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadAudio(summaries.bullet, `${studyPack.name}_bullet_summary`)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {audioPlaying === 'bullet_audio' && (
                <div className="mb-4">
                  <Progress value={audioProgress} className="h-2" />
                </div>
              )}
              <div className="space-y-2">
                {summaries.bullet.split('\n').filter((line: string) => line.trim()).map((point: string, index: number) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-primary mt-1">•</span>
                    <span className="text-foreground">{point.replace(/^[•\-*]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simple">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>Explain Like I'm 5</span>
              </CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => playAudio(summaries.simple, 'simple')}
                >
                  {audioPlaying === 'simple_audio' ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadAudio(summaries.simple, `${studyPack.name}_simple_summary`)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {audioPlaying === 'simple_audio' && (
                <div className="mb-4">
                  <Progress value={audioProgress} className="h-2" />
                </div>
              )}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-foreground leading-relaxed">{summaries.simple}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paragraph">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Concise Paragraph</span>
              </CardTitle>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => playAudio(summaries.paragraph, 'paragraph')}
                >
                  {audioPlaying === 'paragraph_audio' ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadAudio(summaries.paragraph, `${studyPack.name}_paragraph_summary`)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {audioPlaying === 'paragraph_audio' && (
                <div className="mb-4">
                  <Progress value={audioProgress} className="h-2" />
                </div>
              )}
              <p className="text-foreground leading-relaxed">{summaries.paragraph}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mnemonics">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span>🧠</span>
                <span>Memory Aids & Mnemonics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summaries.mnemonics.map((mnemonic: any, index: number) => (
                  <div key={index} className="border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-foreground">{mnemonic.concept}</h4>
                      <Badge variant="secondary">{mnemonic.type}</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm mb-2">{mnemonic.explanation}</p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <p className="text-foreground font-medium">{mnemonic.mnemonic}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
