import { TranslationProvider } from './translation-service';
import { Language, TranslationResult } from '../../types';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import axios, { AxiosInstance } from 'axios';

/**
 * OpenAI Translation Provider
 * Uses OpenAI's GPT models for translation between Indian languages
 */
export class OpenAITranslationProvider extends TranslationProvider {
  private client: AxiosInstance;
  private readonly model: string = 'gpt-3.5-turbo';
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000;

  constructor(apiKey?: string) {
    super();
    
    const key = apiKey || config.apiKeys.openai;
    if (!key) {
      throw new Error('OpenAI API key is required');
    }

    this.client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds timeout
    });
  }

  async translate(text: string, from: Language, to: Language): Promise<TranslationResult> {
    const prompt = this.buildTranslationPrompt(text, from, to);
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`OpenAI translation attempt ${attempt}/${this.maxRetries}: ${from.code} -> ${to.code}`);
        
        const response = await this.client.post('/chat/completions', {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a professional translator specializing in Indian languages. Provide accurate, culturally appropriate translations. For numbers, prices, and measurements, preserve the exact values. Respond only with the translation, no explanations.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 500,
          temperature: 0.1, // Low temperature for consistent translations
        });

        const translatedText = response.data.choices[0]?.message?.content?.trim();
        
        if (!translatedText) {
          throw new Error('Empty response from OpenAI');
        }

        // Calculate confidence based on response quality
        const confidence = this.calculateConfidence(text, translatedText, response.data);

        return {
          translatedText,
          confidence,
          detectedSourceLanguage: from,
        };

      } catch (error) {
        logger.error(`OpenAI translation attempt ${attempt} failed:`, error);
        
        if (attempt === this.maxRetries) {
          throw new Error(`OpenAI translation failed after ${this.maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Wait before retrying
        await this.delay(this.retryDelay * attempt);
      }
    }

    throw new Error('Translation failed - should not reach here');
  }

  async detectLanguage(text: string): Promise<string> {
    const prompt = `Detect the language of this text and respond with only the ISO 639-1 language code (e.g., "hi" for Hindi, "en" for English, "ta" for Tamil): "${text}"`;
    
    try {
      logger.info('OpenAI language detection');
      
      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a language detection expert. Respond only with the ISO 639-1 language code, nothing else.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 10,
        temperature: 0,
      });

      const detectedCode = response.data.choices[0]?.message?.content?.trim().toLowerCase();
      
      if (!detectedCode || detectedCode.length !== 2) {
        throw new Error('Invalid language code from OpenAI');
      }

      return detectedCode;

    } catch (error) {
      logger.error('OpenAI language detection failed:', error);
      throw new Error(`Language detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build translation prompt for OpenAI
   */
  private buildTranslationPrompt(text: string, from: Language, to: Language): string {
    return `Translate the following text from ${from.name} (${from.nativeName}) to ${to.name} (${to.nativeName}). 

Important instructions:
- Preserve all numbers, prices (₹), measurements, and quantities exactly as they appear
- Maintain cultural context and use appropriate formal/informal tone
- For market/trading terms, use commonly understood local terminology
- Do not add explanations or notes, only provide the translation

Text to translate: "${text}"`;
  }

  /**
   * Calculate confidence score based on response quality
   */
  private calculateConfidence(originalText: string, translatedText: string, apiResponse: any): number {
    let confidence = 0.8; // Base confidence for OpenAI

    // Adjust based on text length similarity
    const lengthRatio = translatedText.length / originalText.length;
    if (lengthRatio < 0.3 || lengthRatio > 3.0) {
      confidence -= 0.2;
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
        confidence -= 0.3;
      }
    }

    // Check for obvious translation failures
    if (translatedText === originalText && originalText.length > 5) {
      confidence -= 0.4; // Likely no translation occurred
    }

    // Ensure confidence is within bounds
    return Math.max(0.1, Math.min(1.0, confidence));
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
      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
      });
      
      return response.status === 200;
    } catch (error) {
      logger.error('OpenAI health check failed:', error);
      return false;
    }
  }

  /**
   * Get usage statistics (if available)
   */
  getUsageStats(): { model: string; maxRetries: number } {
    return {
      model: this.model,
      maxRetries: this.maxRetries,
    };
  }
}