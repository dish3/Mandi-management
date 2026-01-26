import axios, { AxiosInstance, AxiosResponse, isAxiosError } from 'axios';
import { MarketDataAdapter } from '../../interfaces/market-data';
import { MandiPrice, HistoricalPrice } from '../../types';
import { config } from '../../config';
import { logger } from '../../utils/logger';

/**
 * Government API Market Data Adapter
 * Integrates with Indian government mandi APIs for real-time price data
 */
export class GovernmentMarketDataAdapter implements MarketDataAdapter {
  private logger = logger;
  private httpClient: AxiosInstance;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number = 10000; // 10 seconds
  private readonly maxRetries: number = 3;

  // Government API endpoints
  private readonly endpoints = {
    currentPrices: 'current-prices',
    historicalPrices: 'historical-prices',
    locations: 'locations',
    products: 'products',
    health: 'health'
  };

  constructor() {
    this.baseUrl = config.externalApis.mandiBaseUrl;
    this.apiKey = config.apiKeys.mandiApi;
    
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MultilinguaMandiPlatform/1.0',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      }
    });

    // Add request/response interceptors for logging and error handling
    this.setupInterceptors();
  }

  /**
   * Fetch current mandi prices for a location and date
   */
  async fetchMandiPrices(location: string, date: Date): Promise<MandiPrice[]> {
    this.logger.info('Fetching mandi prices', { location, date });

    try {
      const response = await this.makeRequestWithRetry(
        'GET',
        this.endpoints.currentPrices,
        {
          params: {
            location: this.normalizeLocation(location),
            date: this.formatDate(date),
            format: 'json'
          }
        }
      );

      const mandiPrices = this.parseMandiPricesResponse(response.data, location);
      
      this.logger.info('Successfully fetched mandi prices', {
        location,
        count: mandiPrices.length
      });

      return mandiPrices;
    } catch (error) {
      this.logger.error('Failed to fetch mandi prices', { location, date, error });
      
      // Return empty array instead of throwing to allow fallback mechanisms
      return [];
    }
  }

  /**
   * Get historical price data for a product and location
   */
  async getHistoricalData(product: string, location: string, days: number): Promise<HistoricalPrice[]> {
    this.logger.info('Fetching historical price data', { product, location, days });

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const response = await this.makeRequestWithRetry(
        'GET',
        this.endpoints.historicalPrices,
        {
          params: {
            product: this.normalizeProductName(product),
            location: this.normalizeLocation(location),
            startDate: this.formatDate(startDate),
            endDate: this.formatDate(endDate),
            format: 'json'
          }
        }
      );

      const historicalPrices = this.parseHistoricalPricesResponse(response.data, location);
      
      this.logger.info('Successfully fetched historical price data', {
        product,
        location,
        count: historicalPrices.length
      });

      return historicalPrices;
    } catch (error) {
      this.logger.error('Failed to fetch historical price data', { product, location, days, error });
      
      // Return empty array to allow fallback mechanisms
      return [];
    }
  }

  /**
   * Validate if market data is fresh and reliable
   */
  validateDataFreshness(data: MandiPrice): boolean {
    const now = new Date();
    const dataAge = now.getTime() - data.date.getTime();
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours

    // Data is fresh if:
    // 1. It's less than 24 hours old
    // 2. It's from a verified source
    // 3. Price is reasonable (> 0)
    const isFresh = dataAge < maxAgeMs;
    const isVerified = data.verified;
    const hasValidPrice = data.price > 0;

    const isValid = isFresh && isVerified && hasValidPrice;

    this.logger.debug('Validating data freshness', {
      product: data.product,
      location: data.location,
      dataAge: Math.round(dataAge / (60 * 60 * 1000)), // hours
      isFresh,
      isVerified,
      hasValidPrice,
      isValid
    });

    return isValid;
  }

  /**
   * Check if API is available and responsive
   */
  async checkApiHealth(): Promise<boolean> {
    this.logger.debug('Checking API health');

    try {
      const response = await this.httpClient.get(this.endpoints.health, {
        timeout: 5000 // Shorter timeout for health checks
      });

      const isHealthy = response.status === 200 && response.data?.status === 'ok';
      
      this.logger.info('API health check completed', { isHealthy });
      
      return isHealthy;
    } catch (error) {
      this.logger.warn('API health check failed', { error });
      return false;
    }
  }

  /**
   * Get supported locations for price data
   */
  async getSupportedLocations(): Promise<string[]> {
    this.logger.debug('Fetching supported locations');

    try {
      const response = await this.makeRequestWithRetry(
        'GET',
        this.endpoints.locations,
        { params: { format: 'json' } }
      );

      const locations = this.parseLocationsResponse(response.data);
      
      this.logger.info('Successfully fetched supported locations', {
        count: locations.length
      });

      return locations;
    } catch (error) {
      this.logger.error('Failed to fetch supported locations', { error });
      
      // Return default locations as fallback
      return this.getDefaultLocations();
    }
  }

  /**
   * Get supported product categories
   */
  async getSupportedProducts(): Promise<string[]> {
    this.logger.debug('Fetching supported products');

    try {
      const response = await this.makeRequestWithRetry(
        'GET',
        this.endpoints.products,
        { params: { format: 'json' } }
      );

      const products = this.parseProductsResponse(response.data);
      
      this.logger.info('Successfully fetched supported products', {
        count: products.length
      });

      return products;
    } catch (error) {
      this.logger.error('Failed to fetch supported products', { error });
      
      // Return default products as fallback
      return this.getDefaultProducts();
    }
  }

  // Private helper methods

  private setupInterceptors(): void {
    // Request interceptor
    this.httpClient.interceptors.request.use(
      (config) => {
        this.logger.debug('Making API request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          params: config.params
        });
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug('API response received', {
          status: response.status,
          url: response.config.url
        });
        return response;
      },
      (error) => {
        this.logger.error('Response interceptor error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  private async makeRequestWithRetry(
    method: 'GET' | 'POST',
    endpoint: string,
    options: any = {}
  ): Promise<AxiosResponse> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        this.logger.debug(`API request attempt ${attempt}/${this.maxRetries}`, {
          method,
          endpoint
        });

        const response = method === 'GET' 
          ? await this.httpClient.get(endpoint, options)
          : await this.httpClient.post(endpoint, options.data, options);

        return response;
      } catch (error) {
        lastError = error as Error;
        
        this.logger.warn(`API request attempt ${attempt} failed`, {
          method,
          endpoint,
          error: lastError.message
        });

        // Don't retry on client errors (4xx)
        if (isAxiosError(error) && error.response?.status && error.response.status >= 400 && error.response.status < 500) {
          break;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  private parseMandiPricesResponse(data: any, location: string): MandiPrice[] {
    try {
      // Handle different response formats from government APIs
      const records = data.records || data.data || data;
      
      if (!Array.isArray(records)) {
        this.logger.warn('Unexpected API response format', { data });
        return [];
      }

      return records.map((record: any) => ({
        product: this.extractProductName(record),
        location: location,
        price: this.parsePrice(record.price || record.modal_price || record.max_price),
        date: this.parseDate(record.date || record.arrival_date),
        source: 'government_api',
        verified: true
      })).filter((price: MandiPrice) => price.price > 0);
    } catch (error) {
      this.logger.error('Failed to parse mandi prices response', { error, data });
      return [];
    }
  }

  private parseHistoricalPricesResponse(data: any, location: string): HistoricalPrice[] {
    try {
      const records = data.records || data.data || data;
      
      if (!Array.isArray(records)) {
        this.logger.warn('Unexpected historical data response format', { data });
        return [];
      }

      return records.map((record: any) => ({
        date: this.parseDate(record.date || record.arrival_date),
        price: this.parsePrice(record.price || record.modal_price || record.max_price),
        volume: this.parseVolume(record.quantity || record.arrivals),
        location: location
      })).filter((price: HistoricalPrice) => price.price > 0);
    } catch (error) {
      this.logger.error('Failed to parse historical prices response', { error, data });
      return [];
    }
  }

  private parseLocationsResponse(data: any): string[] {
    try {
      const records = data.records || data.data || data;
      
      if (!Array.isArray(records)) {
        return this.getDefaultLocations();
      }

      return records.map((record: any) => 
        record.location || record.market || record.district
      ).filter(Boolean);
    } catch (error) {
      this.logger.error('Failed to parse locations response', { error });
      return this.getDefaultLocations();
    }
  }

  private parseProductsResponse(data: any): string[] {
    try {
      const records = data.records || data.data || data;
      
      if (!Array.isArray(records)) {
        return this.getDefaultProducts();
      }

      return records.map((record: any) => 
        record.product || record.commodity || record.name
      ).filter(Boolean);
    } catch (error) {
      this.logger.error('Failed to parse products response', { error });
      return this.getDefaultProducts();
    }
  }

  private extractProductName(record: any): string {
    return record.commodity || record.product || record.name || 'Unknown';
  }

  private parsePrice(priceStr: any): number {
    if (typeof priceStr === 'number') return priceStr;
    if (typeof priceStr === 'string') {
      // Remove currency symbols and parse
      const cleaned = priceStr.replace(/[₹,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private parseDate(dateStr: any): Date {
    if (dateStr instanceof Date) return dateStr;
    if (typeof dateStr === 'string') {
      const parsed = new Date(dateStr);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    return new Date();
  }

  private parseVolume(volumeStr: any): number {
    if (typeof volumeStr === 'number') return volumeStr;
    if (typeof volumeStr === 'string') {
      const parsed = parseFloat(volumeStr.replace(/[,\s]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private normalizeLocation(location: string): string {
    return location.toLowerCase().trim().replace(/\s+/g, '-');
  }

  private normalizeProductName(product: string): string {
    return product.toLowerCase().trim().replace(/\s+/g, '-');
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  private getDefaultLocations(): string[] {
    return [
      'Delhi',
      'Mumbai',
      'Bangalore',
      'Chennai',
      'Kolkata',
      'Hyderabad',
      'Pune',
      'Ahmedabad',
      'Jaipur',
      'Lucknow'
    ];
  }

  private getDefaultProducts(): string[] {
    return [
      'Rice',
      'Wheat',
      'Onion',
      'Potato',
      'Tomato',
      'Garlic',
      'Ginger',
      'Turmeric',
      'Coriander',
      'Cumin'
    ];
  }
}