import { VoiceInterface } from '../../interfaces/voice';
import { Language, QualityScore } from '../../types';
import { SUPPORTED_LANGUAGES, isVoiceSupported } from '../../constants/languages';
import { logger } from '../../utils/logger';

/**
 * Google Speech Services Provider
 * Integrates with Google Cloud Speech-to-Text and Text-to-Speech APIs
 */
export class GoogleVoiceProvider implements VoiceInterface {
  private readonly apiKey: string;
  private readonly projectId: string;
  private readonly baseUrl = 'https://speech.googleapis.com/v1';
  private readonly ttsBaseUrl = 'https://texttospeech.googleapis.com/v1';

  constructor(apiKey?: string, projectId?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_SPEECH_API_KEY || '';
    this.projectId = projectId || process.env.GOOGLE_CLOUD_PROJECT_ID || '';
    
    if (!this.apiKey) {
      logger.warn('Google Speech API key not provided. Service will not function properly.');
    }
  }

  /**
   * Convert speech audio to text using Google Speech-to-Text API
   */
  async speechToText(audioData: ArrayBuffer, language: Language): Promise<string> {
    logger.info(`Converting speech to text using Google API for language: ${language.code}`);
    
    this.validateInputs(audioData, language);
    
    if (!this.apiKey) {
      throw new Error('Google Speech API key not configured');
    }

    try {
      // Validate audio quality first
      const qualityScore = await this.validateAudioQuality(audioData);
      if (qualityScore.score < 60) {
        throw new Error(`Audio quality too low for Google Speech API: ${qualityScore.score}`);
      }

      // Convert ArrayBuffer to base64
      const audioBase64 = this.arrayBufferToBase64(audioData);
      
      // Prepare request payload
      const requestBody = {
        config: {
          encoding: 'WEBM_OPUS', // Assuming WebM Opus format
          sampleRateHertz: 16000,
          languageCode: this.mapLanguageCodeForGoogle(language.code),
          enableAutomaticPunctuation: true,
          model: 'latest_long'
        },
        audio: {
          content: audioBase64
        }
      };

      const response = await fetch(`${this.baseUrl}/speech:recognize?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        throw new Error(`Google Speech API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json() as any;
      
      if (!result.results || result.results.length === 0) {
        throw new Error('No speech recognized in audio');
      }

      const transcript = result.results
        .map((r: any) => r.alternatives[0]?.transcript || '')
        .join(' ')
        .trim();

      if (!transcript) {
        throw new Error('Empty transcript received from Google Speech API');
      }

      logger.info(`Google Speech-to-text conversion successful for language: ${language.code}`);
      return transcript;
    } catch (error) {
      logger.error(`Google Speech-to-text conversion failed: ${error}`);
      throw new Error(`Google Speech-to-text conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert text to speech audio using Google Text-to-Speech API
   */
  async textToSpeech(text: string, language: Language): Promise<ArrayBuffer> {
    logger.info(`Converting text to speech using Google API for language: ${language.code}`);
    
    this.validateTextInput(text, language);
    
    if (!this.apiKey) {
      throw new Error('Google Speech API key not configured');
    }

    try {
      // Prepare request payload
      const requestBody = {
        input: { text },
        voice: {
          languageCode: this.mapLanguageCodeForGoogle(language.code),
          name: this.getVoiceName(language.code),
          ssmlGender: 'NEUTRAL'
        },
        audioConfig: {
          audioEncoding: 'OGG_OPUS',
          speakingRate: 1.0,
          pitch: 0.0,
          volumeGainDb: 0.0
        }
      };

      const response = await fetch(`${this.ttsBaseUrl}/text:synthesize?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        throw new Error(`Google TTS API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json() as any;
      
      if (!result.audioContent) {
        throw new Error('No audio content received from Google TTS API');
      }

      // Convert base64 audio to ArrayBuffer
      const audioBuffer = this.base64ToArrayBuffer(result.audioContent);
      
      logger.info(`Google Text-to-speech conversion successful for language: ${language.code}`);
      return audioBuffer;
    } catch (error) {
      logger.error(`Google Text-to-speech conversion failed: ${error}`);
      throw new Error(`Google Text-to-speech conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect language from audio input using Google Speech API
   */
  async detectLanguage(audioData: ArrayBuffer): Promise<Language> {
    logger.info('Detecting language using Google Speech API');
    
    this.validateAudioData(audioData);
    
    if (!this.apiKey) {
      throw new Error('Google Speech API key not configured');
    }

    try {
      // Convert ArrayBuffer to base64
      const audioBase64 = this.arrayBufferToBase64(audioData);
      
      // Use multiple language codes for detection
      const supportedGoogleCodes = SUPPORTED_LANGUAGES
        .filter(lang => lang.voiceSupported)
        .map(lang => this.mapLanguageCodeForGoogle(lang.code));

      const requestBody = {
        config: {
          encoding: 'WEBM_OPUS',
          sampleRateHertz: 16000,
          languageCode: supportedGoogleCodes[0], // Primary language
          alternativeLanguageCodes: supportedGoogleCodes.slice(1, 4), // Up to 3 alternatives
          enableAutomaticPunctuation: false,
          model: 'latest_short'
        },
        audio: {
          content: audioBase64
        }
      };

      const response = await fetch(`${this.baseUrl}/speech:recognize?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        throw new Error(`Google Speech API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json() as any;
      
      if (!result.results || result.results.length === 0) {
        // Fallback to first supported language if no results
        const fallbackLanguage = SUPPORTED_LANGUAGES.find(lang => lang.voiceSupported);
        if (!fallbackLanguage) {
          throw new Error('No supported languages available');
        }
        logger.warn('No language detected, using fallback language');
        return fallbackLanguage;
      }

      // Get detected language from the result
      const detectedLanguageCode = result.results[0]?.languageCode || supportedGoogleCodes[0];
      const mappedCode = this.mapGoogleLanguageCodeToInternal(detectedLanguageCode);
      
      const language = SUPPORTED_LANGUAGES.find(lang => lang.code === mappedCode);
      if (!language) {
        throw new Error(`Detected language ${mappedCode} is not supported`);
      }

      logger.info(`Language detected by Google API: ${language.code}`);
      return language;
    } catch (error) {
      logger.error(`Google language detection failed: ${error}`);
      throw new Error(`Google language detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate audio quality for processing
   */
  async validateAudioQuality(audioData: ArrayBuffer): Promise<QualityScore> {
    logger.info('Validating audio quality for Google Speech API');
    
    this.validateAudioData(audioData);

    const issues: string[] = [];
    let score = 100;

    // Check audio size
    const sizeKB = audioData.byteLength / 1024;
    const sizeMB = sizeKB / 1024;

    // Google Speech API limits
    if (sizeMB > 10) {
      issues.push('Audio file too large for Google Speech API (max 10MB)');
      score -= 40;
    }

    if (sizeKB < 1) {
      issues.push('Audio file too small for reliable processing');
      score -= 30;
    }

    // Estimate duration (rough calculation)
    const estimatedDuration = this.estimateAudioDuration(audioData);
    if (estimatedDuration < 0.1) {
      issues.push('Audio too short (minimum 0.1 seconds)');
      score -= 25;
    }

    if (estimatedDuration > 60) {
      issues.push('Audio too long for optimal processing (max 60 seconds recommended)');
      score -= 15;
    }

    // Basic format validation
    if (!this.isValidAudioFormat(audioData)) {
      issues.push('Audio format may not be supported');
      score -= 20;
    }

    score = Math.max(0, score);

    const recommendation = this.generateQualityRecommendation(score, issues);

    const qualityScore: QualityScore = {
      score,
      issues,
      recommendation
    };

    logger.info(`Google Speech API audio quality validation complete. Score: ${score}`);
    return qualityScore;
  }

  /**
   * Check if language is supported for voice processing
   */
  isVoiceSupported(language: Language): boolean {
    return isVoiceSupported(language.code) && this.isGoogleLanguageSupported(language.code);
  }

  /**
   * Get supported voice languages
   */
  async getSupportedVoiceLanguages(): Promise<Language[]> {
    return SUPPORTED_LANGUAGES.filter(lang => 
      lang.voiceSupported && this.isGoogleLanguageSupported(lang.code)
    );
  }

  // Private helper methods

  private validateInputs(audioData: ArrayBuffer, language: Language): void {
    this.validateAudioData(audioData);
    this.validateLanguageSupport(language);
  }

  private validateTextInput(text: string, language: Language): void {
    if (!text || text.trim().length === 0) {
      throw new Error('Text is empty or invalid');
    }
    if (text.length > 5000) {
      throw new Error('Text too long for Google TTS API (max 5000 characters)');
    }
    this.validateLanguageSupport(language);
  }

  private validateAudioData(audioData: ArrayBuffer): void {
    if (!audioData || audioData.byteLength === 0) {
      throw new Error('Audio data is empty or invalid');
    }
  }

  private validateLanguageSupport(language: Language): void {
    if (!this.isVoiceSupported(language)) {
      throw new Error(`Voice processing not supported for language: ${language.code}`);
    }
  }

  private mapLanguageCodeForGoogle(internalCode: string): string {
    const mapping: Record<string, string> = {
      'hi': 'hi-IN',
      'mr': 'mr-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'gu': 'gu-IN',
      'bn': 'bn-IN',
      'kn': 'kn-IN',
      'pa': 'pa-IN',
      'en': 'en-IN'
    };
    return mapping[internalCode] || 'en-IN';
  }

  private mapGoogleLanguageCodeToInternal(googleCode: string): string {
    const mapping: Record<string, string> = {
      'hi-IN': 'hi',
      'mr-IN': 'mr',
      'ta-IN': 'ta',
      'te-IN': 'te',
      'gu-IN': 'gu',
      'bn-IN': 'bn',
      'kn-IN': 'kn',
      'pa-IN': 'pa',
      'en-IN': 'en'
    };
    return mapping[googleCode] || googleCode.split('-')[0];
  }

  private getVoiceName(internalCode: string): string {
    const voiceNames: Record<string, string> = {
      'hi': 'hi-IN-Standard-A',
      'mr': 'mr-IN-Standard-A',
      'ta': 'ta-IN-Standard-A',
      'te': 'te-IN-Standard-A',
      'gu': 'gu-IN-Standard-A',
      'bn': 'bn-IN-Standard-A',
      'kn': 'kn-IN-Standard-A',
      'pa': 'pa-IN-Standard-A',
      'en': 'en-IN-Standard-A'
    };
    return voiceNames[internalCode] || 'en-IN-Standard-A';
  }

  private isGoogleLanguageSupported(internalCode: string): boolean {
    const supportedCodes = ['hi', 'mr', 'ta', 'te', 'gu', 'bn', 'kn', 'pa', 'en'];
    return supportedCodes.includes(internalCode);
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private estimateAudioDuration(audioData: ArrayBuffer): number {
    // Rough estimation: assume 16kHz, 16-bit mono audio
    const bytesPerSecond = 16000 * 2; // 16kHz * 2 bytes per sample
    return audioData.byteLength / bytesPerSecond;
  }

  private isValidAudioFormat(audioData: ArrayBuffer): boolean {
    // Basic validation - check for common audio file headers
    const view = new Uint8Array(audioData);
    if (view.length < 4) return false;

    // Check for common audio formats
    const header = Array.from(view.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // WebM, OGG, WAV, MP3 headers
    const validHeaders = ['1a45dfa3', '4f676753', '52494646', 'fff3', 'fff2', 'fffb'];
    return validHeaders.some(validHeader => header.startsWith(validHeader));
  }

  private generateQualityRecommendation(score: number, issues: string[]): string {
    if (score >= 90) {
      return 'Excellent audio quality for Google Speech API';
    } else if (score >= 75) {
      return 'Good audio quality for Google Speech API';
    } else if (score >= 60) {
      return 'Fair audio quality. May affect accuracy with Google Speech API.';
    } else if (score >= 40) {
      return `Poor audio quality for Google Speech API. Issues: ${issues.join(', ')}. Consider re-recording.`;
    } else {
      return `Very poor audio quality. Issues: ${issues.join(', ')}. Please re-record with better conditions for Google Speech API.`;
    }
  }
}