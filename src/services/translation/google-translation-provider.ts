import { TranslationProvider } from './translation-service';
import { Language, TranslationResult } from '../../types';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import axios, { AxiosInstance } from 'axios';

/**
 * Google Translate Provider
 * Uses Google Cloud Translation API for translation between Indian languages
 */
export class GoogleTranslationProvider extends TranslationProvider {
  private client: AxiosInstance;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000;

  constructor(apiKey?: string) {
    super();
    
    const key = apiKey || config.apiKeys.googleTranslate;
    if (!key) {
      throw new Error('Google Translate API key is required');
    }

    this.client = axios.create({
      baseURL: 'https://translation.googleapis.com/language/translate/v2',
      timeout: 15000, // 15 seconds timeout
      params: {
        key: key,
      },
    });
  }

  async translate(text: string, from: Language, to: Language): Promise<TranslationResult> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`Google Translate attempt ${attempt}/${this.maxRetries}: ${from.code} -> ${to.code}`);
        
        const response = await this.client.post('', {
          q: text,
          source: from.code,
          target: to.code,
          format: 'text',
        });

        const translation = response.data.data?.translations?.[0];
        
        if (!translation || !translation.translatedText) {
          throw new Error('Empty response from Google Translate');
        }

        // Decode HTML entities that Google might return
        const translatedText = this.decodeHtmlEntities(translation.translatedText);
        
        // Calculate confidence
        const confidence = this.calculateConfidence(
          text, 
          translatedText, 
          translation.detectedSourceLanguage || from.code
        );

        return {
          translatedText,
          confidence,
          detectedSourceLanguage: from,
        };

      } catch (error) {
        logger.error(`Google Translate attempt ${attempt} failed:`, error);
        
        if (attempt === this.maxRetries) {
          throw new Error(`Google Translate failed after ${this.maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Wait before retrying
        await this.delay(this.retryDelay * attempt);
      }
    }

    throw new Error('Translation failed - should not reach here');
  }

  async detectLanguage(text: string): Promise<string> {
    try {
      logger.info('Google Translate language detection');
      
      const response = await this.client.post('/detect', {
        q: text,
      });

      const detection = response.data.data?.detections?.[0]?.[0];
      
      if (!detection || !detection.language) {
        throw new Error('No language detected by Google Translate');
      }

      return detection.language;

    } catch (error) {
      logger.error('Google Translate language detection failed:', error);
      throw new Error(`Language detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get supported languages from Google Translate
   */
  async getSupportedLanguages(): Promise<string[]> {
    try {
      const response = await this.client.get('/languages');
      
      const languages = response.data.data?.languages || [];
      return languages.map((lang: any) => lang.language);

    } catch (error) {
      logger.error('Failed to get supported languages:', error);
      return []; // Return empty array on failure
    }
  }

  /**
   * Calculate confidence score based on response quality
   */
  private calculateConfidence(originalText: string, translatedText: string, detectedLang: string): number {
    let confidence = 0.85; // Base confidence for Google Translate

    // Adjust based on text length similarity
    const lengthRatio = translatedText.length / originalText.length;
    if (lengthRatio < 0.3 || lengthRatio > 3.0) {
      confidence -= 0.15;
    }

    // Check if numbers are preserved
    const originalNumbers = originalText.match(/[\d₹.,]+/g) || [];
    const translatedNumbers = translatedText.match(/[\d₹.,]+/g) || [];
    
    if (originalNumbers.length > 0) {
      const numbersPreserved = originalNumbers.every(num => 
        translatedNumbers.some(tNum => tNum.includes(num.replace(/[₹.,]/g, '')))
      );
      if (numbersPreserved) {
        confidence += 0.1;
      } else {
        confidence -= 0.25;
      }
    }

    // Check for obvious translation failures
    if (translatedText === originalText && originalText.length > 5) {
      confidence -= 0.3; // Likely no translation occurred
    }

    // Boost confidence if text contains common patterns
    if (/^[\d\s₹.,]+$/.test(originalText)) {
      confidence = 0.95; // High confidence for numeric content
    }

    // Ensure confidence is within bounds
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Decode HTML entities that Google Translate might return
   */
  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
    };

    return text.replace(/&[#\w]+;/g, (entity) => {
      return entities[entity] || entity;
    });
  }

  /**
   * Delay utility for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check API health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/languages');
      return response.status === 200;
    } catch (error) {
      logger.error('Google Translate health check failed:', error);
      return false;
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats(): { maxRetries: number; timeout: number } {
    return {
      maxRetries: this.maxRetries,
      timeout: 15000,
    };
  }
}