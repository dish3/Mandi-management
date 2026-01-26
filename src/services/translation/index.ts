// Export translation service components
export { TranslationService, TranslationProvider } from './translation-service';
export { MockTranslationProvider } from './mock-translation-provider';
export { OpenAITranslationProvider } from './openai-translation-provider';
export { GoogleTranslationProvider } from './google-translation-provider';
export { TranslationServiceFactory, TranslationProviderType } from './translation-factory';

// Factory function to create translation service with mock provider
import { TranslationService } from './translation-service';
import { MockTranslationProvider } from './mock-translation-provider';
import { TranslationServiceFactory } from './translation-factory';

/**
 * Create a translation service instance with mock provider for development
 */
export function createMockTranslationService(): TranslationService {
  const mockProvider = new MockTranslationProvider();
  return new TranslationService(mockProvider);
}

/**
 * Create a translation service instance with specified provider
 */
export function createTranslationService(provider: any): TranslationService {
  return new TranslationService(provider);
}

/**
 * Create a translation service with automatic provider selection
 */
export function createAutoTranslationService(): TranslationService {
  return TranslationServiceFactory.createAuto();
}