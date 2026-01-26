import { Language, QualityScore } from '../types';

/**
 * Voice Interface
 * Handles speech-to-text and text-to-speech conversion
 */
export interface VoiceInterface {
  /**
   * Convert speech audio to text
   */
  speechToText(audioData: ArrayBuffer, language: Language): Promise<string>;

  /**
   * Convert text to speech audio
   */
  textToSpeech(text: string, language: Language): Promise<ArrayBuffer>;

  /**
   * Detect language from audio input
   */
  detectLanguage(audioData: ArrayBuffer): Promise<Language>;

  /**
   * Validate audio quality for processing
   */
  validateAudioQuality(audioData: ArrayBuffer): Promise<QualityScore>;

  /**
   * Check if language is supported for voice processing
   */
  isVoiceSupported(language: Language): boolean;

  /**
   * Get supported voice languages
   */
  getSupportedVoiceLanguages(): Promise<Language[]>;
}