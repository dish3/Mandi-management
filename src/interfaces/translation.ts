import { Language, TranslationResult } from '../types';

/**
 * Translation Service Adapter Interface
 * Provides real-time text translation between supported languages
 */
export interface TranslationServiceAdapter {
  /**
   * Translate text from source to target language
   */
  translate(text: string, from: Language, to: Language): Promise<TranslationResult>;

  /**
   * Detect the language of given text
   */
  detectLanguage(text: string): Promise<Language>;

  /**
   * Get list of supported languages
   */
  getSupportedLanguages(): Promise<Language[]>;

  /**
   * Check if a language is supported for translation
   */
  isLanguageSupported(language: Language): boolean;

  /**
   * Validate translation quality and confidence
   */
  validateTranslation(original: string, translated: string, confidence: number): boolean;
}