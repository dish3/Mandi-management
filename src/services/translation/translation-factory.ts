import { TranslationService, TranslationProvider } from './translation-service';
import { MockTranslationProvider } from './mock-translation-provider';
import { OpenAITranslationProvider } from './openai-translation-provider';
import { GoogleTranslationProvider } from './google-translation-provider';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export type TranslationProviderType = 'mock' | 'openai' | 'google';

/**
 * Translation Service Factory
 * Creates translation service instances with different providers
 */
export class TranslationServiceFactory {
  /**
   * Create a translation service with the specified provider
   */
  static create(providerType: TranslationProviderType = 'mock'): TranslationService {
    const provider = this.createProvider(providerType);
    return new TranslationService(provider);
  }

  /**
   * Create a translation service with automatic provider selection
   * Falls back to mock if external providers are not configured
   */
  static createAuto(): TranslationService {
    // Try to create providers in order of preference
    const providers: TranslationProviderType[] = ['openai', 'google', 'mock'];
    
    for (const providerType of providers) {
      try {
        const provider = this.createProvider(providerType);
        logger.info(`Created translation service with ${providerType} provider`);
        return new TranslationService(provider);
      } catch (error) {
        logger.warn(`Failed to create ${providerType} provider:`, error);
        continue;
      }
    }

    // Fallback to mock (should always work)
    logger.info('Falling back to mock translation provider');
    return new TranslationService(new MockTranslationProvider());
  }

  /**
   * Create a provider instance
   */
  private static createProvider(providerType: TranslationProviderType): TranslationProvider {
    switch (providerType) {
      case 'mock':
        return new MockTranslationProvider();
        
      case 'openai':
        if (!config.apiKeys.openai) {
          throw new Error('OpenAI API key not configured');
        }
        return new OpenAITranslationProvider(config.apiKeys.openai);
        
      case 'google':
        if (!config.apiKeys.googleTranslate) {
          throw new Error('Google Translate API key not configured');
        }
        return new GoogleTranslationProvider(config.apiKeys.googleTranslate);
        
      default:
        throw new Error(`Unknown provider type: ${providerType}`);
    }
  }

  /**
   * Check if a provider type is available (has required configuration)
   */
  static isProviderAvailable(providerType: TranslationProviderType): boolean {
    switch (providerType) {
      case 'mock':
        return true; // Always available
        
      case 'openai':
        return !!config.apiKeys.openai;
        
      case 'google':
        return !!config.apiKeys.googleTranslate;
        
      default:
        return false;
    }
  }

  /**
   * Get list of available provider types
   */
  static getAvailableProviders(): TranslationProviderType[] {
    const allProviders: TranslationProviderType[] = ['mock', 'openai', 'google'];
    return allProviders.filter(provider => this.isProviderAvailable(provider));
  }

  /**
   * Health check for a specific provider
   */
  static async checkProviderHealth(providerType: TranslationProviderType): Promise<boolean> {
    try {
      const provider = this.createProvider(providerType);
      
      if ('checkHealth' in provider && typeof provider.checkHealth === 'function') {
        return await provider.checkHealth();
      }
      
      // For providers without health check, assume healthy if creation succeeded
      return true;
    } catch (error) {
      logger.error(`Health check failed for ${providerType}:`, error);
      return false;
    }
  }
}