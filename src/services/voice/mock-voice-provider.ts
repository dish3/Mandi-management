import { VoiceInterface } from '../../interfaces/voice';
import { Language, QualityScore } from '../../types';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';

/**
 * Mock Voice Provider for testing and development
 * Simulates voice processing without external API calls
 */
export class MockVoiceProvider implements VoiceInterface {
  private readonly mockResponses: Record<string, string> = {
    'hi': 'आपका स्वागत है',
    'mr': 'तुमचे स्वागत आहे',
    'ta': 'உங்களை வரவேற்கிறோம்',
    'te': 'మీకు స్వాగతం',
    'gu': 'તમારું સ્વાગત છે',
    'bn': 'আপনাকে স্বাগতম',
    'kn': 'ನಿಮಗೆ ಸ್ವಾಗತ',
    'pa': 'ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ',
    'en': 'Welcome'
  };

  async speechToText(audioData: ArrayBuffer, language: Language): Promise<string> {
    // Validate inputs
    if (!audioData || audioData.byteLength === 0) {
      throw new Error('Audio data is empty');
    }

    if (!this.isVoiceSupported(language)) {
      throw new Error(`Language ${language.code} not supported for voice processing`);
    }

    // Simulate processing delay
    await this.simulateDelay(100, 300);

    // Return mock response based on language
    return this.mockResponses[language.code] || this.mockResponses['en'];
  }

  async textToSpeech(text: string, language: Language): Promise<ArrayBuffer> {
    // Validate inputs
    if (!text || text.trim().length === 0) {
      throw new Error('Text is empty');
    }

    if (!this.isVoiceSupported(language)) {
      throw new Error(`Language ${language.code} not supported for voice processing`);
    }

    // Simulate processing delay
    await this.simulateDelay(200, 500);

    // Create mock audio buffer
    const audioSize = Math.max(1000, text.length * 100);
    const audioBuffer = new ArrayBuffer(audioSize);
    const view = new Uint8Array(audioBuffer);

    // Fill with deterministic mock data based on text
    const textHash = this.hashString(text);
    for (let i = 0; i < view.length; i++) {
      view[i] = (textHash + i) % 256;
    }

    return audioBuffer;
  }

  async detectLanguage(audioData: ArrayBuffer): Promise<Language> {
    // Validate input
    if (!audioData || audioData.byteLength === 0) {
      throw new Error('Audio data is empty');
    }

    // Simulate processing delay
    await this.simulateDelay(150, 250);

    // Return a deterministic language based on audio data hash
    const hash = this.hashArrayBuffer(audioData);
    const supportedLanguages = SUPPORTED_LANGUAGES.filter(lang => lang.voiceSupported);
    const index = hash % supportedLanguages.length;
    
    return supportedLanguages[index];
  }

  async validateAudioQuality(audioData: ArrayBuffer): Promise<QualityScore> {
    // Validate input
    if (!audioData || audioData.byteLength === 0) {
      throw new Error('Audio data is empty');
    }

    // Simulate processing delay
    await this.simulateDelay(50, 150);

    const issues: string[] = [];
    let score = 85; // Default good score

    // Simulate quality checks based on audio size and content
    const sizeKB = audioData.byteLength / 1024;
    
    if (sizeKB < 5) {
      issues.push('Audio file very small');
      score -= 20;
    } else if (sizeKB < 10) {
      issues.push('Audio file small');
      score -= 10;
    }

    if (sizeKB > 1000) {
      issues.push('Audio file very large');
      score -= 15;
    }

    // Simulate noise detection based on data hash
    const hash = this.hashArrayBuffer(audioData);
    const noiseLevel = (hash % 30) / 100; // 0-0.3 noise level
    
    if (noiseLevel > 0.2) {
      issues.push('Background noise detected');
      score -= 15;
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    const recommendation = this.generateRecommendation(score, issues);

    return {
      score,
      issues,
      recommendation
    };
  }

  isVoiceSupported(language: Language): boolean {
    return SUPPORTED_LANGUAGES.some(
      lang => lang.code === language.code && lang.voiceSupported
    );
  }

  async getSupportedVoiceLanguages(): Promise<Language[]> {
    return SUPPORTED_LANGUAGES.filter(lang => lang.voiceSupported);
  }

  // Helper methods

  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private hashArrayBuffer(buffer: ArrayBuffer): number {
    const view = new Uint8Array(buffer);
    let hash = 0;
    const sampleSize = Math.min(view.length, 1000); // Sample first 1000 bytes
    
    for (let i = 0; i < sampleSize; i++) {
      hash = ((hash << 5) - hash) + view[i];
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private generateRecommendation(score: number, issues: string[]): string {
    if (score >= 90) {
      return 'Excellent audio quality - ready for processing';
    } else if (score >= 75) {
      return 'Good audio quality - suitable for processing';
    } else if (score >= 60) {
      return 'Fair audio quality - may affect accuracy';
    } else if (score >= 40) {
      return `Poor audio quality. Issues: ${issues.join(', ')}. Consider re-recording.`;
    } else {
      return `Very poor audio quality. Issues: ${issues.join(', ')}. Please re-record in better conditions.`;
    }
  }
}