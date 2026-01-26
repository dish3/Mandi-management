import { VoiceInterface } from '../../interfaces/voice';
import { Language, QualityScore } from '../../types';
import { SUPPORTED_LANGUAGES, isVoiceSupported } from '../../constants/languages';
import { logger } from '../../utils/logger';

/**
 * AWS Speech Services Provider
 * Integrates with AWS Transcribe and AWS Polly APIs
 */
export class AWSVoiceProvider implements VoiceInterface {
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;
  private readonly region: string;
  private readonly transcribeEndpoint: string;
  private readonly pollyEndpoint: string;

  constructor(accessKeyId?: string, secretAccessKey?: string, region?: string) {
    this.accessKeyId = accessKeyId || process.env.AWS_ACCESS_KEY_ID || '';
    this.secretAccessKey = secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || '';
    this.region = region || process.env.AWS_REGION || 'us-east-1';
    this.transcribeEndpoint = `https://transcribe.${this.region}.amazonaws.com`;
    this.pollyEndpoint = `https://polly.${this.region}.amazonaws.com`;
    
    if (!this.accessKeyId || !this.secretAccessKey) {
      logger.warn('AWS credentials not provided. Service will not function properly.');
    }
  }

  /**
   * Convert speech audio to text using AWS Transcribe
   */
  async speechToText(audioData: ArrayBuffer, language: Language): Promise<string> {
    logger.info(`Converting speech to text using AWS Transcribe for language: ${language.code}`);
    
    this.validateInputs(audioData, language);
    
    if (!this.accessKeyId || !this.secretAccessKey) {
      throw new Error('AWS credentials not configured');
    }

    try {
      // Validate audio quality first
      const qualityScore = await this.validateAudioQuality(audioData);
      if (qualityScore.score < 60) {
        throw new Error(`Audio quality too low for AWS Transcribe: ${qualityScore.score}`);
      }

      // For real implementation, would use AWS SDK
      // This is a simplified mock implementation showing the structure
      const transcript = await this.mockTranscribeCall(audioData, language);
      
      logger.info(`AWS Transcribe conversion successful for language: ${language.code}`);
      return transcript;
    } catch (error) {
      logger.error(`AWS Transcribe conversion failed: ${error}`);
      throw new Error(`AWS Transcribe conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert text to speech audio using AWS Polly
   */
  async textToSpeech(text: string, language: Language): Promise<ArrayBuffer> {
    logger.info(`Converting text to speech using AWS Polly for language: ${language.code}`);
    
    this.validateTextInput(text, language);
    
    if (!this.accessKeyId || !this.secretAccessKey) {
      throw new Error('AWS credentials not configured');
    }

    try {
      // For real implementation, would use AWS SDK
      // This is a simplified mock implementation showing the structure
      const audioBuffer = await this.mockPollyCall(text, language);
      
      logger.info(`AWS Polly conversion successful for language: ${language.code}`);
      return audioBuffer;
    } catch (error) {
      logger.error(`AWS Polly conversion failed: ${error}`);
      throw new Error(`AWS Polly conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect language from audio input using AWS Transcribe
   */
  async detectLanguage(audioData: ArrayBuffer): Promise<Language> {
    logger.info('Detecting language using AWS Transcribe');
    
    this.validateAudioData(audioData);
    
    if (!this.accessKeyId || !this.secretAccessKey) {
      throw new Error('AWS credentials not configured');
    }

    try {
      // For real implementation, would use AWS Transcribe language identification
      const detectedLanguageCode = await this.mockLanguageDetection(audioData);
      
      const language = SUPPORTED_LANGUAGES.find(lang => lang.code === detectedLanguageCode);
      if (!language) {
        throw new Error(`Detected language ${detectedLanguageCode} is not supported`);
      }

      logger.info(`Language detected by AWS Transcribe: ${language.code}`);
      return language;
    } catch (error) {
      logger.error(`AWS language detection failed: ${error}`);
      throw new Error(`AWS language detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate audio quality for AWS services
   */
  async validateAudioQuality(audioData: ArrayBuffer): Promise<QualityScore> {
    logger.info('Validating audio quality for AWS Speech services');
    
    this.validateAudioData(audioData);

    const issues: string[] = [];
    let score = 100;

    // Check audio size
    const sizeKB = audioData.byteLength / 1024;
    const sizeMB = sizeKB / 1024;

    // AWS Transcribe limits
    if (sizeMB > 2048) { // 2GB limit for AWS Transcribe
      issues.push('Audio file too large for AWS Transcribe (max 2GB)');
      score -= 40;
    }

    if (sizeKB < 1) {
      issues.push('Audio file too small for reliable processing');
      score -= 30;
    }

    // Estimate duration
    const estimatedDuration = this.estimateAudioDuration(audioData);
    if (estimatedDuration < 0.1) {
      issues.push('Audio too short (minimum 0.1 seconds)');
      score -= 25;
    }

    if (estimatedDuration > 14400) { // 4 hours limit
      issues.push('Audio too long for AWS Transcribe (max 4 hours)');
      score -= 15;
    }

    // Sample rate validation
    if (!this.isValidSampleRate(audioData)) {
      issues.push('Audio sample rate may not be optimal (recommended: 16kHz or 8kHz)');
      score -= 10;
    }

    // Format validation
    if (!this.isValidAudioFormat(audioData)) {
      issues.push('Audio format may not be supported by AWS services');
      score -= 20;
    }

    score = Math.max(0, score);

    const recommendation = this.generateQualityRecommendation(score, issues);

    const qualityScore: QualityScore = {
      score,
      issues,
      recommendation
    };

    logger.info(`AWS Speech services audio quality validation complete. Score: ${score}`);
    return qualityScore;
  }

  /**
   * Check if language is supported for voice processing
   */
  isVoiceSupported(language: Language): boolean {
    return isVoiceSupported(language.code) && this.isAWSLanguageSupported(language.code);
  }

  /**
   * Get supported voice languages
   */
  async getSupportedVoiceLanguages(): Promise<Language[]> {
    return SUPPORTED_LANGUAGES.filter(lang => 
      lang.voiceSupported && this.isAWSLanguageSupported(lang.code)
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
    if (text.length > 6000) { // AWS Polly limit
      throw new Error('Text too long for AWS Polly (max 6000 characters)');
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

  private mapLanguageCodeForAWS(internalCode: string): string {
    const mapping: Record<string, string> = {
      'hi': 'hi-IN',
      'mr': 'mr-IN', // May not be supported by AWS
      'ta': 'ta-IN',
      'te': 'te-IN',
      'gu': 'gu-IN',
      'bn': 'bn-IN',
      'kn': 'kn-IN',
      'pa': 'pa-IN', // May not be supported by AWS
      'en': 'en-IN'
    };
    return mapping[internalCode] || 'en-IN';
  }

  private getPollyVoiceId(internalCode: string): string {
    const voiceIds: Record<string, string> = {
      'hi': 'Aditi', // Hindi voice
      'ta': 'Aditi', // Fallback to Hindi voice for Tamil
      'te': 'Aditi', // Fallback to Hindi voice for Telugu
      'gu': 'Aditi', // Fallback to Hindi voice for Gujarati
      'bn': 'Aditi', // Fallback to Hindi voice for Bengali
      'kn': 'Aditi', // Fallback to Hindi voice for Kannada
      'en': 'Raveena' // English Indian voice
    };
    return voiceIds[internalCode] || 'Raveena';
  }

  private isAWSLanguageSupported(internalCode: string): boolean {
    // AWS has limited support for Indian languages
    const supportedCodes = ['hi', 'ta', 'te', 'en'];
    return supportedCodes.includes(internalCode);
  }

  private estimateAudioDuration(audioData: ArrayBuffer): number {
    // Rough estimation: assume 16kHz, 16-bit mono audio
    const bytesPerSecond = 16000 * 2;
    return audioData.byteLength / bytesPerSecond;
  }

  private isValidSampleRate(audioData: ArrayBuffer): boolean {
    // This is a simplified check - in real implementation would parse audio headers
    // AWS Transcribe supports 8kHz and 16kHz primarily
    return true; // Assume valid for mock implementation
  }

  private isValidAudioFormat(audioData: ArrayBuffer): boolean {
    // AWS supports MP3, MP4, WAV, FLAC, AMR, OGG, WebM
    const view = new Uint8Array(audioData);
    if (view.length < 4) return false;

    const header = Array.from(view.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Common audio format headers
    const validHeaders = [
      'fff3', 'fff2', 'fffb', // MP3
      '52494646', // WAV
      '664c6143', // FLAC
      '4f676753', // OGG
      '1a45dfa3'  // WebM
    ];
    
    return validHeaders.some(validHeader => header.startsWith(validHeader));
  }

  private generateQualityRecommendation(score: number, issues: string[]): string {
    if (score >= 90) {
      return 'Excellent audio quality for AWS Speech services';
    } else if (score >= 75) {
      return 'Good audio quality for AWS Speech services';
    } else if (score >= 60) {
      return 'Fair audio quality. May affect accuracy with AWS services.';
    } else if (score >= 40) {
      return `Poor audio quality for AWS services. Issues: ${issues.join(', ')}. Consider re-recording.`;
    } else {
      return `Very poor audio quality. Issues: ${issues.join(', ')}. Please re-record with better conditions for AWS services.`;
    }
  }

  // Mock implementations for demonstration
  // In real implementation, these would use AWS SDK

  private async mockTranscribeCall(audioData: ArrayBuffer, language: Language): Promise<string> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock responses based on language
    const mockResponses: Record<string, string> = {
      'hi': 'यह एक परीक्षण संदेश है',
      'ta': 'இது ஒரு சோதனை செய்தி',
      'te': 'ఇది ఒక పరీక్ష సందేశం',
      'gu': 'આ એક પરીક્ષણ સંદેશ છે',
      'bn': 'এটি একটি পরীক্ষার বার্তা',
      'kn': 'ಇದು ಒಂದು ಪರೀಕ್ಷಾ ಸಂದೇಶ',
      'en': 'This is a test message from AWS Transcribe'
    };

    return mockResponses[language.code] || mockResponses['en'];
  }

  private async mockPollyCall(text: string, language: Language): Promise<ArrayBuffer> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Create mock audio buffer based on text and language
    const baseSize = 2000;
    const textFactor = text.length * 80;
    const languageFactor = this.hashString(language.code) % 500;
    const mockAudioSize = baseSize + textFactor + languageFactor;
    
    const audioBuffer = new ArrayBuffer(mockAudioSize);
    const view = new Uint8Array(audioBuffer);
    
    // Fill with deterministic mock audio data
    const textHash = this.hashString(text + language.code + 'aws-polly');
    for (let i = 0; i < view.length; i++) {
      view[i] = (textHash + i) % 256;
    }
    
    return audioBuffer;
  }

  private async mockLanguageDetection(audioData: ArrayBuffer): Promise<string> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Return a deterministic language based on audio data
    const supportedCodes = SUPPORTED_LANGUAGES
      .filter(lang => lang.voiceSupported && this.isAWSLanguageSupported(lang.code))
      .map(lang => lang.code);
    
    const hash = this.hashArrayBuffer(audioData);
    const index = hash % supportedCodes.length;
    return supportedCodes[index];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private hashArrayBuffer(buffer: ArrayBuffer): number {
    const view = new Uint8Array(buffer);
    let hash = 0;
    const sampleSize = Math.min(view.length, 1000);
    
    for (let i = 0; i < sampleSize; i++) {
      hash = ((hash << 5) - hash) + view[i];
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}