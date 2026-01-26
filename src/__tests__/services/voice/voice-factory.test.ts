import { VoiceFactory, VoiceProviderType } from '../../../services/voice/voice-factory';
import { VoiceService } from '../../../services/voice/voice-service';
import { MockVoiceProvider } from '../../../services/voice/mock-voice-provider';

describe('VoiceFactory', () => {
  beforeEach(() => {
    // Clear cache before each test
    VoiceFactory.clearCache();
  });

  afterEach(() => {
    // Clean up after each test
    VoiceFactory.clearCache();
  });

  describe('createVoiceService', () => {
    it('should create default voice service', () => {
      const service = VoiceFactory.createVoiceService();
      
      expect(service).toBeInstanceOf(VoiceService);
    });

    it('should create mock voice provider', () => {
      const service = VoiceFactory.createVoiceService('mock');
      
      expect(service).toBeInstanceOf(MockVoiceProvider);
    });

    it('should create default service when provider is "default"', () => {
      const service = VoiceFactory.createVoiceService('default');
      
      expect(service).toBeInstanceOf(VoiceService);
    });

    it('should create Google voice provider', () => {
      const service = VoiceFactory.createVoiceService('google');
      
      expect(service).toBeDefined();
      expect(service.isVoiceSupported).toBeDefined();
    });

    it('should create AWS voice provider', () => {
      const service = VoiceFactory.createVoiceService('aws');
      
      expect(service).toBeDefined();
      expect(service.isVoiceSupported).toBeDefined();
    });

    it('should throw error for unimplemented Azure provider', () => {
      expect(() => VoiceFactory.createVoiceService('azure'))
        .toThrow('Azure Speech service not implemented yet');
    });

    it('should return cached instance on subsequent calls', () => {
      const service1 = VoiceFactory.createVoiceService('mock');
      const service2 = VoiceFactory.createVoiceService('mock');
      
      expect(service1).toBe(service2); // Same instance
    });

    it('should create different instances for different providers', () => {
      const mockService = VoiceFactory.createVoiceService('mock');
      const defaultService = VoiceFactory.createVoiceService('default');
      
      expect(mockService).not.toBe(defaultService);
      expect(mockService).toBeInstanceOf(MockVoiceProvider);
      expect(defaultService).toBeInstanceOf(VoiceService);
    });

    it('should handle invalid provider type gracefully', () => {
      const service = VoiceFactory.createVoiceService('invalid' as VoiceProviderType);
      
      // Should fall back to default
      expect(service).toBeInstanceOf(VoiceService);
    });
  });

  describe('clearCache', () => {
    it('should clear cached instances', () => {
      const service1 = VoiceFactory.createVoiceService('mock');
      VoiceFactory.clearCache();
      const service2 = VoiceFactory.createVoiceService('mock');
      
      expect(service1).not.toBe(service2); // Different instances after cache clear
    });

    it('should not affect service functionality after clearing cache', () => {
      const service1 = VoiceFactory.createVoiceService('mock');
      VoiceFactory.clearCache();
      const service2 = VoiceFactory.createVoiceService('mock');
      
      expect(service1).toBeInstanceOf(MockVoiceProvider);
      expect(service2).toBeInstanceOf(MockVoiceProvider);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of available providers', () => {
      const providers = VoiceFactory.getAvailableProviders();
      
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
      expect(providers).toContain('mock');
      expect(providers).toContain('google');
      expect(providers).toContain('aws');
      expect(providers).toContain('default');
    });

    it('should not include unimplemented providers', () => {
      const providers = VoiceFactory.getAvailableProviders();
      
      expect(providers).not.toContain('azure');
    });
  });

  describe('isProviderAvailable', () => {
    it('should return true for available providers', () => {
      expect(VoiceFactory.isProviderAvailable('mock')).toBe(true);
      expect(VoiceFactory.isProviderAvailable('google')).toBe(true);
      expect(VoiceFactory.isProviderAvailable('aws')).toBe(true);
      expect(VoiceFactory.isProviderAvailable('default')).toBe(true);
    });

    it('should return false for unavailable providers', () => {
      expect(VoiceFactory.isProviderAvailable('azure')).toBe(false);
    });

    it('should return false for invalid providers', () => {
      expect(VoiceFactory.isProviderAvailable('invalid' as VoiceProviderType)).toBe(false);
    });
  });

  describe('caching behavior', () => {
    it('should maintain separate caches for different providers', () => {
      const mockService1 = VoiceFactory.createVoiceService('mock');
      const defaultService1 = VoiceFactory.createVoiceService('default');
      
      const mockService2 = VoiceFactory.createVoiceService('mock');
      const defaultService2 = VoiceFactory.createVoiceService('default');
      
      expect(mockService1).toBe(mockService2);
      expect(defaultService1).toBe(defaultService2);
      expect(mockService1).not.toBe(defaultService1);
    });

    it('should handle concurrent access safely', () => {
      const promises = Array.from({ length: 10 }, () => 
        Promise.resolve(VoiceFactory.createVoiceService('mock'))
      );
      
      return Promise.all(promises).then(services => {
        // All services should be the same instance
        for (let i = 1; i < services.length; i++) {
          expect(services[i]).toBe(services[0]);
        }
      });
    });
  });

  describe('integration with voice services', () => {
    it('should create functional mock voice service', async () => {
      const service = VoiceFactory.createVoiceService('mock');
      const languages = await service.getSupportedVoiceLanguages();
      
      expect(languages.length).toBeGreaterThan(0);
      expect(languages.every(lang => lang.voiceSupported)).toBe(true);
    });

    it('should create functional default voice service', async () => {
      const service = VoiceFactory.createVoiceService('default');
      const languages = await service.getSupportedVoiceLanguages();
      
      expect(languages.length).toBeGreaterThan(0);
      expect(languages.every(lang => lang.voiceSupported)).toBe(true);
    });

    it('should maintain service state across factory calls', async () => {
      const service1 = VoiceFactory.createVoiceService('mock');
      const service2 = VoiceFactory.createVoiceService('mock');
      
      // Both should be the same instance and maintain state
      expect(service1).toBe(service2);
      
      const languages1 = await service1.getSupportedVoiceLanguages();
      const languages2 = await service2.getSupportedVoiceLanguages();
      
      expect(languages1).toEqual(languages2);
    });
  });

  describe('error handling', () => {
    it('should handle null provider gracefully', () => {
      const service = VoiceFactory.createVoiceService(null as any);
      
      // Should fall back to default
      expect(service).toBeInstanceOf(VoiceService);
    });

    it('should handle undefined provider gracefully', () => {
      const service = VoiceFactory.createVoiceService(undefined as any);
      
      // Should fall back to default
      expect(service).toBeInstanceOf(VoiceService);
    });
  });
});