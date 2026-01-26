import { TranslationServiceAdapter } from '../../interfaces/translation';
import { Language, TranslationResult } from '../../types';
import { SUPPORTED_LANGUAGES, getLanguageByCode, isLanguageSupported } from '../../constants/languages';
import { logger } from '../../utils/logger';
import { sanitizeText } from '../../utils/validation';

/**
 * Translation Service Implementation
 * Provides real-time text translation between supported Indian languages
 */
export class TranslationService implements TranslationServiceAdapter {
  private cache: Map<string, TranslationResult> = new Map();
  private readonly cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours

  constructor(private provider: TranslationProvider) {}

  /**
   * Translate text from source to target language
   */
  async translate(text: string, from: Language, to: Language): Promise<TranslationResult> {
    try {
      // Validate inputs
      if (!text || text.trim().length === 0) {
        throw new Error('Text to translate cannot be empty');
      }

      if (!this.isLanguageSupported(from)) {
        throw new Error(`Source language ${from.code} is not supported`);
      }

      if (!this.isLanguageSupported(to)) {
        throw new Error(`Target language ${to.code} is not supported`);
      }

      // If source and target are the same, return original text
      if (from.code === to.code) {
        return {
          translatedText: text,
          confidence: 1.0,
          detectedSourceLanguage: from,
        };
      }

      // Sanitize input text
      const sanitizedText = sanitizeText(text);

      // Check cache first
      const cacheKey = `${from.code}-${to.code}-${sanitizedText}`;
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.debug(`Translation cache hit for ${cacheKey}`);
        return cached;
      }

      // Perform translation
      logger.info(`Translating text from ${from.code} to ${to.code}`);
      const result = await this.provider.translate(sanitizedText, from, to);

      // Validate result
      if (!result.translatedText || result.confidence < 0 || result.confidence > 1) {
        throw new Error('Invalid translation result from provider');
      }

      // Cache the result
      this.cache.set(cacheKey, result);
      
      // Clean up old cache entries periodically
      this.cleanupCache();

      return result;
    } catch (error) {
      logger.error('Translation failed:', error);
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect the language of given text
   */
  async detectLanguage(text: string): Promise<Language> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text for language detection cannot be empty');
      }

      const sanitizedText = sanitizeText(text);
      logger.info('Detecting language for text');
      
      const detectedCode = await this.provider.detectLanguage(sanitizedText);
      const language = getLanguageByCode(detectedCode);
      
      if (!language) {
        throw new Error(`Detected language ${detectedCode} is not supported`);
      }

      return language;
    } catch (error) {
      logger.error('Language detection failed:', error);
      throw new Error(`Language detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get list of supported languages
   */
  async getSupportedLanguages(): Promise<Language[]> {
    return SUPPORTED_LANGUAGES.filter(lang => lang.isSupported);
  }

  /**
   * Check if a language is supported for translation
   */
  isLanguageSupported(language: Language): boolean {
    return isLanguageSupported(language.code);
  }

  /**
   * Validate translation quality and confidence
   */
  validateTranslation(original: string, translated: string, confidence: number): boolean {
    // Basic validation rules
    if (!original || !translated) {
      return false;
    }

    if (confidence < 0.3) {
      return false;
    }

    // Check if translation is too similar (might indicate no translation occurred)
    if (original === translated && confidence < 0.9) {
      return false;
    }

    // Check for reasonable length ratio (translated text shouldn't be too different in length)
    const lengthRatio = translated.length / original.length;
    if (lengthRatio < 0.3 || lengthRatio > 3.0) {
      return false;
    }

    return true;
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCache(): void {
    if (this.cache.size > 1000) {
      // Simple cleanup: clear half the cache when it gets too large
      const entries = Array.from(this.cache.entries());
      const toKeep = entries.slice(entries.length / 2);
      this.cache.clear();
      toKeep.forEach(([key, value]) => this.cache.set(key, value));
      logger.debug('Translation cache cleaned up');
    }
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Translation cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: 1000,
    };
  }
}

/**
 * Abstract Translation Provider Interface
 * Allows different translation backends (OpenAI, Google Translate, etc.)
 */
export abstract class TranslationProvider {
  abstract translate(text: string, from: Language, to: Language): Promise<TranslationResult>;
  abstract detectLanguage(text: string): Promise<string>;
}