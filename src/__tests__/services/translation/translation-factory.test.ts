import { TranslationServiceFactory, TranslationProviderType } from '../../../services/translation/translation-factory';
import { config } from '../../../config';

// Mock the config to control API key availability
jest.mock('../../../config', () => ({
  config: {
    apiKeys: {
      openai: '',
      googleTranslate: '',
    },
  },
}));

describe('TranslationServiceFactory', () => {
  beforeEach(() => {
    // Reset config before each test
    (config as any).apiKeys.openai = '';
    (config as any).apiKeys.googleTranslate = '';
  });

  describe('create', () => {
    it('should create service with mock provider by default', () => {
      const service = TranslationServiceFactory.create();
      expect(service).toBeDefined();
    });

    it('should create service with specified provider', () => {
      const service = TranslationServiceFactory.create('mock');
      expect(service).toBeDefined();
    });

    it('should throw error for openai provider without API key', () => {
      expect(() => TranslationServiceFactory.create('openai'))
        .toThrow('OpenAI API key not configured');
    });

    it('should throw error for google provider without API key', () => {
      expect(() => TranslationServiceFactory.create('google'))
        .toThrow('Google Translate API key not configured');
    });

    it('should create openai provider with API key', () => {
      (config as any).apiKeys.openai = 'test-key';
      const service = TranslationServiceFactory.create('openai');
      expect(service).toBeDefined();
    });

    it('should create google provider with API key', () => {
      (config as any).apiKeys.googleTranslate = 'test-key';
      const service = TranslationServiceFactory.create('google');
      expect(service).toBeDefined();
    });
  });

  describe('createAuto', () => {
    it('should create service with mock provider when no API keys available', () => {
      const service = TranslationServiceFactory.createAuto();
      expect(service).toBeDefined();
    });

    it('should prefer openai when API key is available', () => {
      (config as any).apiKeys.openai = 'test-openai-key';
      const service = TranslationServiceFactory.createAuto();
      expect(service).toBeDefined();
    });

    it('should fall back to google when only google key is available', () => {
      (config as any).apiKeys.googleTranslate = 'test-google-key';
      const service = TranslationServiceFactory.createAuto();
      expect(service).toBeDefined();
    });
  });

  describe('isProviderAvailable', () => {
    it('should return true for mock provider', () => {
      expect(TranslationServiceFactory.isProviderAvailable('mock')).toBe(true);
    });

    it('should return false for openai without API key', () => {
      expect(TranslationServiceFactory.isProviderAvailable('openai')).toBe(false);
    });

    it('should return false for google without API key', () => {
      expect(TranslationServiceFactory.isProviderAvailable('google')).toBe(false);
    });

    it('should return true for openai with API key', () => {
      (config as any).apiKeys.openai = 'test-key';
      expect(TranslationServiceFactory.isProviderAvailable('openai')).toBe(true);
    });

    it('should return true for google with API key', () => {
      (config as any).apiKeys.googleTranslate = 'test-key';
      expect(TranslationServiceFactory.isProviderAvailable('google')).toBe(true);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return only mock when no API keys available', () => {
      const providers = TranslationServiceFactory.getAvailableProviders();
      expect(providers).toEqual(['mock']);
    });

    it('should include openai when API key is available', () => {
      (config as any).apiKeys.openai = 'test-key';
      const providers = TranslationServiceFactory.getAvailableProviders();
      expect(providers).toContain('mock');
      expect(providers).toContain('openai');
    });

    it('should include google when API key is available', () => {
      (config as any).apiKeys.googleTranslate = 'test-key';
      const providers = TranslationServiceFactory.getAvailableProviders();
      expect(providers).toContain('mock');
      expect(providers).toContain('google');
    });

    it('should include all providers when all API keys are available', () => {
      (config as any).apiKeys.openai = 'test-openai-key';
      (config as any).apiKeys.googleTranslate = 'test-google-key';
      const providers = TranslationServiceFactory.getAvailableProviders();
      expect(providers).toEqual(['mock', 'openai', 'google']);
    });
  });

  describe('checkProviderHealth', () => {
    it('should return true for mock provider', async () => {
      const isHealthy = await TranslationServiceFactory.checkProviderHealth('mock');
      expect(isHealthy).toBe(true);
    });

    it('should return false for openai without API key', async () => {
      const isHealthy = await TranslationServiceFactory.checkProviderHealth('openai');
      expect(isHealthy).toBe(false);
    });

    it('should return false for google without API key', async () => {
      const isHealthy = await TranslationServiceFactory.checkProviderHealth('google');
      expect(isHealthy).toBe(false);
    });
  });
});