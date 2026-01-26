import { AIService } from '../../interfaces/ai-service';
import { OpenAIPriceEstimationService } from './openai-price-estimation-service';
import { MockAIService } from './mock-ai-service';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export type AIServiceProvider = 'openai' | 'mock';

/**
 * Factory for creating AI service instances
 */
export class AIServiceFactory {
  /**
   * Create an AI service instance
   */
  static create(provider: AIServiceProvider): AIService {
    logger.info(`Creating AI service: ${provider}`);

    switch (provider) {
      case 'openai':
        if (!config.apiKeys.openai) {
          throw new Error('OpenAI API key not configured');
        }
        return new OpenAIPriceEstimationService(config.apiKeys.openai);
      
      case 'mock':
        return new MockAIService();
      
      default:
        throw new Error(`Unknown AI service provider: ${provider}`);
    }
  }

  /**
   * Create AI service automatically based on available configuration
   */
  static createAuto(): AIService {
    if (config.apiKeys.openai) {
      logger.info('Auto-creating OpenAI service');
      return this.create('openai');
    }

    logger.info('Auto-creating mock AI service (no API keys configured)');
    return this.create('mock');
  }

  /**
   * Check if a provider is available
   */
  static isProviderAvailable(provider: AIServiceProvider): boolean {
    switch (provider) {
      case 'openai':
        return !!config.apiKeys.openai;
      case 'mock':
        return true;
      default:
        return false;
    }
  }

  /**
   * Get list of available providers
   */
  static getAvailableProviders(): AIServiceProvider[] {
    const providers: AIServiceProvider[] = ['mock'];
    
    if (config.apiKeys.openai) {
      providers.push('openai');
    }
    
    return providers;
  }

  /**
   * Validate configuration for AI services
   */
  static validateConfiguration(): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    
    if (!config.apiKeys.openai) {
      warnings.push('OpenAI API key not configured - AI features will use mock service');
    }
    
    return {
      isValid: true, // Mock service is always available
      warnings
    };
  }
}