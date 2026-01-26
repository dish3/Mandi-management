import { PriceDiscoveryEngine } from '../../interfaces/price-discovery';
import { MarketDataAdapter } from '../../interfaces/market-data';
import { PriceDiscoveryService } from './price-discovery-service';
import { MarketDataFactory } from './market-data-factory';
import { logger } from '../../utils/logger';

export type PriceDiscoveryProvider = 'mock' | 'government-api' | 'cached' | 'hybrid';

/**
 * Factory for creating Price Discovery Engine instances
 */
export class PriceDiscoveryFactory {
  private static logger = logger;

  /**
   * Create a Price Discovery Engine with the specified provider
   */
  static async create(provider: PriceDiscoveryProvider = 'cached'): Promise<PriceDiscoveryEngine> {
    this.logger.info('Creating Price Discovery Engine', { provider });

    const marketDataAdapter = await this.createMarketDataAdapter(provider);
    const service = new PriceDiscoveryService(marketDataAdapter);
    
    // Initialize the service
    await service.initialize();
    
    return service;
  }

  /**
   * Create a Market Data Adapter based on the provider type
   */
  private static async createMarketDataAdapter(provider: PriceDiscoveryProvider): Promise<MarketDataAdapter> {
    switch (provider) {
      case 'mock':
        this.logger.debug('Creating mock market data adapter');
        return MarketDataFactory.createMockAdapter();
      
      case 'government-api':
        this.logger.debug('Creating government API market data adapter');
        return await MarketDataFactory.createAdapter({ 
          useCache: false, 
          adapterType: 'government' 
        });
      
      case 'cached':
        this.logger.debug('Creating cached market data adapter');
        return await MarketDataFactory.createAdapter({ 
          useCache: true, 
          adapterType: 'cached' 
        });
      
      case 'hybrid':
        this.logger.debug('Creating hybrid market data adapter');
        // Hybrid uses cached adapter with fallback capabilities
        return await MarketDataFactory.createAdapter({ 
          useCache: true, 
          adapterType: 'cached' 
        });
      
      default:
        this.logger.warn('Unknown provider, falling back to cached', { provider });
        return await MarketDataFactory.createAdapter({ 
          useCache: true, 
          adapterType: 'cached' 
        });
    }
  }

  /**
   * Create a Price Discovery Engine with custom market data adapter
   */
  static async createWithAdapter(adapter: MarketDataAdapter): Promise<PriceDiscoveryEngine> {
    this.logger.info('Creating Price Discovery Engine with custom adapter');
    const service = new PriceDiscoveryService(adapter);
    await service.initialize();
    return service;
  }

  /**
   * Get available provider types
   */
  static getAvailableProviders(): PriceDiscoveryProvider[] {
    return ['mock', 'government-api', 'cached', 'hybrid'];
  }

  /**
   * Validate provider configuration
   */
  static validateProvider(provider: PriceDiscoveryProvider): boolean {
    const availableProviders = this.getAvailableProviders();
    return availableProviders.includes(provider);
  }

  /**
   * Validate system configuration for price discovery
   */
  static validateConfiguration(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const marketDataValidation = MarketDataFactory.validateConfiguration();
    
    return {
      isValid: marketDataValidation.isValid,
      errors: marketDataValidation.errors,
      warnings: marketDataValidation.warnings
    };
  }
}