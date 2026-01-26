import { AIServiceFactory, AIServiceProvider } from '../../../services/ai/ai-service-factory';
import { OpenAIPriceEstimationService } from '../../../services/ai/openai-price-estimation-service';
import { MockAIService } from '../../../services/ai/mock-ai-service';
import { config } from '../../../config';

// Mock the config to control API key availability
jest.mock('../../../config', () => ({
  config: {
    apiKeys: {
      openai: '',
    }
  }
}));

describe('AIServiceFactory', () => {
  beforeEach(() => {
    // Reset config before each test
    (config as any).apiKeys.openai = '';
  });

  describe('create', () => {
    it('should create mock service', () => {
      const service = AIServiceFactory.create('mock');
      expect(service).toBeInstanceOf(MockAIService);
    });

    it('should create openai service with API key', () => {
      (config as any).apiKeys.openai = 'test-key';
      const service = AIServiceFactory.create('openai');
      expect(service).toBeInstanceOf(OpenAIPriceEstimationService);
    });

    it('should throw error for openai without API key', () => {
      expect(() => {
        AIServiceFactory.create('openai');
      }).toThrow('OpenAI API key not configured');
    });

    it('should throw error for unknown provider', () => {
      expect(() => {
        AIServiceFactory.create('unknown' as AIServiceProvider);
      }).toThrow('Unknown AI service provider: unknown');
    });
  });

  describe('createAuto', () => {
    it('should prefer openai when API key is available', () => {
      (config as any).apiKeys.openai = 'test-openai-key';
      const service = AIServiceFactory.createAuto();
      expect(service).toBeInstanceOf(OpenAIPriceEstimationService);
    });

    it('should fall back to mock when no API keys are available', () => {
      const service = AIServiceFactory.createAuto();
      expect(service).toBeInstanceOf(MockAIService);
    });
  });

  describe('isProviderAvailable', () => {
    it('should return true for mock service', () => {
      expect(AIServiceFactory.isProviderAvailable('mock')).toBe(true);
    });

    it('should return true for openai with API key', () => {
      (config as any).apiKeys.openai = 'test-key';
      expect(AIServiceFactory.isProviderAvailable('openai')).toBe(true);
    });

    it('should return false for openai without API key', () => {
      expect(AIServiceFactory.isProviderAvailable('openai')).toBe(false);
    });

    it('should return false for unknown provider', () => {
      expect(AIServiceFactory.isProviderAvailable('unknown' as AIServiceProvider)).toBe(false);
    });
  });

  describe('getAvailableProviders', () => {
    it('should always include mock', () => {
      const providers = AIServiceFactory.getAvailableProviders();
      expect(providers).toContain('mock');
    });

    it('should include openai when API key is available', () => {
      (config as any).apiKeys.openai = 'test-key';
      const providers = AIServiceFactory.getAvailableProviders();
      expect(providers).toContain('mock');
      expect(providers).toContain('openai');
    });

    it('should only include mock when no API keys are available', () => {
      const providers = AIServiceFactory.getAvailableProviders();
      expect(providers).toEqual(['mock']);
    });
  });

  describe('validateConfiguration', () => {
    it('should always be valid (mock service available)', () => {
      const result = AIServiceFactory.validateConfiguration();
      expect(result.isValid).toBe(true);
    });

    it('should warn when OpenAI API key is missing', () => {
      const result = AIServiceFactory.validateConfiguration();
      expect(result.warnings).toContain('OpenAI API key not configured - AI features will use mock service');
    });

    it('should not warn when OpenAI API key is available', () => {
      (config as any).apiKeys.openai = 'test-key';
      const result = AIServiceFactory.validateConfiguration();
      expect(result.warnings).not.toContain('OpenAI API key not configured - AI features will use mock service');
    });
  });
});