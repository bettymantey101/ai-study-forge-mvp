export class AudioService {
  private static audioContext: AudioContext | null = null;
  
  static async textToSpeech(text: string): Promise<Blob> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Check if Speech Synthesis API is available
    if ('speechSynthesis' in window) {
      return this.generateSpeechSynthesisAudio(text);
    } else {
      // Fallback to generating a simple tone audio file
      return this.generateToneAudio(text.length);
    }
  }

  private static async generateSpeechSynthesisAudio(text: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        // Create audio context for recording
        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();
        const mediaRecorder = new MediaRecorder(destination.stream);
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          chunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(chunks, { type: 'audio/wav' });
          resolve(audioBlob);
        };

        // Start recording
        mediaRecorder.start();

        // Create speech synthesis utterance
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        // Find a good voice
        const voices = speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
          voice.lang.startsWith('en') && voice.localService
        ) || voices[0];
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onend = () => {
          setTimeout(() => {
            mediaRecorder.stop();
            audioContext.close();
          }, 100);
        };

        utterance.onerror = (error) => {
          mediaRecorder.stop();
          audioContext.close();
          reject(error);
        };

        speechSynthesis.speak(utterance);

      } catch (error) {
        reject(error);
      }
    });
  }

  private static async generateToneAudio(textLength: number): Promise<Blob> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const duration = Math.min(Math.max(textLength * 0.1, 2), 30); // 2-30 seconds based on text length
    const sampleRate = this.audioContext.sampleRate;
    const frameCount = sampleRate * duration;
    
    const audioBuffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    // Generate a pleasant tone sequence to represent speech
    for (let i = 0; i < frameCount; i++) {
      const time = i / sampleRate;
      const frequency = 200 + Math.sin(time * 2) * 100; // Varying frequency like speech
      const amplitude = Math.sin(time * Math.PI * 2) * 0.1; // Amplitude modulation
      channelData[i] = Math.sin(2 * Math.PI * frequency * time) * amplitude;
    }

    // Convert AudioBuffer to WAV Blob
    return this.audioBufferToWav(audioBuffer);
  }

  private static audioBufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    const channelData = buffer.getChannelData(0);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // Convert samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  static async playAudio(audioBlob: Blob): Promise<HTMLAudioElement> {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };
    
    await audio.play();
    return audio;
  }
}
