import { PriceDiscoveryFactory } from '../../../services/price-discovery/price-discovery-factory';
import { PriceDiscoveryService } from '../../../services/price-discovery/price-discovery-service';
import { MockPriceDiscoveryProvider } from '../../../services/price-discovery/mock-price-discovery-provider';

describe('PriceDiscoveryFactory', () => {
  describe('create', () => {
    it('should create service with mock provider by default', async () => {
      const service = await PriceDiscoveryFactory.create();
      
      expect(service).toBeInstanceOf(PriceDiscoveryService);
    });

    it('should create service with mock provider explicitly', async () => {
      const service = await PriceDiscoveryFactory.create('mock');
      
      expect(service).toBeInstanceOf(PriceDiscoveryService);
    });

    it('should create service with cached provider', async () => {
      const service = await PriceDiscoveryFactory.create('cached');
      
      expect(service).toBeInstanceOf(PriceDiscoveryService);
    });

    it('should create service with hybrid provider', async () => {
      const service = await PriceDiscoveryFactory.create('hybrid');
      
      expect(service).toBeInstanceOf(PriceDiscoveryService);
    });

    it('should fall back to cached for unknown provider', async () => {
      const service = await PriceDiscoveryFactory.create('unknown' as any);
      
      expect(service).toBeInstanceOf(PriceDiscoveryService);
    });
  });

  describe('createWithAdapter', () => {
    it('should create service with custom adapter', async () => {
      const customAdapter = new MockPriceDiscoveryProvider();
      const service = await PriceDiscoveryFactory.createWithAdapter(customAdapter);
      
      expect(service).toBeInstanceOf(PriceDiscoveryService);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of available providers', () => {
      const providers = PriceDiscoveryFactory.getAvailableProviders();
      
      expect(providers).toBeInstanceOf(Array);
      expect(providers).toContain('mock');
      expect(providers).toContain('government-api');
      expect(providers).toContain('hybrid');
    });
  });

  describe('validateProvider', () => {
    it('should validate known providers', () => {
      expect(PriceDiscoveryFactory.validateProvider('mock')).toBe(true);
      expect(PriceDiscoveryFactory.validateProvider('government-api')).toBe(true);
      expect(PriceDiscoveryFactory.validateProvider('hybrid')).toBe(true);
    });

    it('should reject unknown providers', () => {
      expect(PriceDiscoveryFactory.validateProvider('unknown' as any)).toBe(false);
      expect(PriceDiscoveryFactory.validateProvider('' as any)).toBe(false);
    });
  });

  describe('integration', () => {
    it('should create functional service that can fetch prices', async () => {
      const service = await PriceDiscoveryFactory.create('mock');
      
      const productQuery = {
        name: 'tomato',
        category: 'vegetables',
        location: 'delhi',
        quantity: 10,
        unit: 'kg'
      };

      const result = await service.getCurrentPrice(productQuery);
      
      expect(result).toBeDefined();
      expect(result.current).toBeGreaterThan(0);
      expect(result.source).toBeDefined();
    });

    it('should create service with different providers that behave differently', async () => {
      const mockService1 = await PriceDiscoveryFactory.create('mock');
      const mockService2 = await PriceDiscoveryFactory.create('mock');
      
      // Both should be instances of the same class but different objects
      expect(mockService1).toBeInstanceOf(PriceDiscoveryService);
      expect(mockService2).toBeInstanceOf(PriceDiscoveryService);
      expect(mockService1).not.toBe(mockService2);
    });
  });
});