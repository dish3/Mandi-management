import { GovernmentMarketDataAdapter } from '../../../services/price-discovery/market-data-adapter';
import { MandiPrice, HistoricalPrice } from '../../../types';
import axios, { isAxiosError } from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedIsAxiosError = isAxiosError as jest.MockedFunction<typeof isAxiosError>;

describe('GovernmentMarketDataAdapter', () => {
  let adapter: GovernmentMarketDataAdapter;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    
    // Mock axios.create to return the mocked instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    adapter = new GovernmentMarketDataAdapter();
  });

  describe('fetchMandiPrices', () => {
    it('should fetch and parse mandi prices successfully', async () => {
      const mockResponse = {
        status: 200,
        data: {
          records: [
            {
              commodity: 'Onion',
              modal_price: '25.50',
              arrival_date: '2024-01-15'
            },
            {
              commodity: 'Potato',
              modal_price: '18.75',
              arrival_date: '2024-01-15'
            }
          ]
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await adapter.fetchMandiPrices('Delhi', new Date('2024-01-15'));

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        product: 'Onion',
        location: 'Delhi',
        price: 25.50,
        date: expect.any(Date),
        source: 'government_api',
        verified: true
      });
      expect(result[1]).toEqual({
        product: 'Potato',
        location: 'Delhi',
        price: 18.75,
        date: expect.any(Date),
        source: 'government_api',
        verified: true
      });
    });

    it('should handle API errors gracefully', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API Error'));

      const result = await adapter.fetchMandiPrices('Delhi', new Date());

      expect(result).toEqual([]);
    });

    it('should filter out invalid prices', async () => {
      const mockResponse = {
        status: 200,
        data: {
          records: [
            {
              commodity: 'Onion',
              modal_price: '25.50',
              arrival_date: '2024-01-15'
            },
            {
              commodity: 'Potato',
              modal_price: '0', // Invalid price
              arrival_date: '2024-01-15'
            },
            {
              commodity: 'Tomato',
              modal_price: 'invalid', // Invalid price format
              arrival_date: '2024-01-15'
            }
          ]
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await adapter.fetchMandiPrices('Delhi', new Date('2024-01-15'));

      expect(result).toHaveLength(1);
      expect(result[0].product).toBe('Onion');
    });

    it('should handle different response formats', async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            product: 'Rice',
            price: '45.00',
            date: '2024-01-15'
          }
        ]
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await adapter.fetchMandiPrices('Mumbai', new Date('2024-01-15'));

      expect(result).toHaveLength(1);
      expect(result[0].product).toBe('Rice');
      expect(result[0].price).toBe(45.00);
    });
  });

  describe('getHistoricalData', () => {
    it('should fetch and parse historical data successfully', async () => {
      const mockResponse = {
        status: 200,
        data: {
          records: [
            {
              commodity: 'Onion',
              modal_price: '25.50',
              arrival_date: '2024-01-10',
              quantity: '100'
            },
            {
              commodity: 'Onion',
              modal_price: '26.00',
              arrival_date: '2024-01-11',
              quantity: '150'
            }
          ]
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await adapter.getHistoricalData('Onion', 'Delhi', 7);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        date: expect.any(Date),
        price: 25.50,
        volume: 100,
        location: 'Delhi'
      });
      expect(result[1]).toEqual({
        date: expect.any(Date),
        price: 26.00,
        volume: 150,
        location: 'Delhi'
      });
    });

    it('should handle API errors gracefully', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API Error'));

      const result = await adapter.getHistoricalData('Onion', 'Delhi', 7);

      expect(result).toEqual([]);
    });
  });

  describe('validateDataFreshness', () => {
    it('should validate fresh, verified data as valid', () => {
      const freshData: MandiPrice = {
        product: 'Onion',
        location: 'Delhi',
        price: 25.50,
        date: new Date(), // Current date
        source: 'government_api',
        verified: true
      };

      const result = adapter.validateDataFreshness(freshData);

      expect(result).toBe(true);
    });

    it('should reject stale data', () => {
      const staleData: MandiPrice = {
        product: 'Onion',
        location: 'Delhi',
        price: 25.50,
        date: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        source: 'government_api',
        verified: true
      };

      const result = adapter.validateDataFreshness(staleData);

      expect(result).toBe(false);
    });

    it('should reject unverified data', () => {
      const unverifiedData: MandiPrice = {
        product: 'Onion',
        location: 'Delhi',
        price: 25.50,
        date: new Date(),
        source: 'government_api',
        verified: false
      };

      const result = adapter.validateDataFreshness(unverifiedData);

      expect(result).toBe(false);
    });

    it('should reject data with invalid price', () => {
      const invalidPriceData: MandiPrice = {
        product: 'Onion',
        location: 'Delhi',
        price: 0,
        date: new Date(),
        source: 'government_api',
        verified: true
      };

      const result = adapter.validateDataFreshness(invalidPriceData);

      expect(result).toBe(false);
    });
  });

  describe('checkApiHealth', () => {
    it('should return true for healthy API', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: { status: 'ok' }
      });

      const result = await adapter.checkApiHealth();

      expect(result).toBe(true);
    });

    it('should return false for unhealthy API', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: { status: 'error' }
      });

      const result = await adapter.checkApiHealth();

      expect(result).toBe(false);
    });

    it('should return false on API error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      const result = await adapter.checkApiHealth();

      expect(result).toBe(false);
    });
  });

  describe('getSupportedLocations', () => {
    it('should fetch and return supported locations', async () => {
      const mockResponse = {
        status: 200,
        data: {
          records: [
            { location: 'Delhi' },
            { location: 'Mumbai' },
            { location: 'Bangalore' }
          ]
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await adapter.getSupportedLocations();

      expect(result).toEqual(['Delhi', 'Mumbai', 'Bangalore']);
    });

    it('should return default locations on API error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API Error'));

      const result = await adapter.getSupportedLocations();

      expect(result).toContain('Delhi');
      expect(result).toContain('Mumbai');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getSupportedProducts', () => {
    it('should fetch and return supported products', async () => {
      const mockResponse = {
        status: 200,
        data: {
          records: [
            { product: 'Onion' },
            { product: 'Potato' },
            { product: 'Tomato' }
          ]
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await adapter.getSupportedProducts();

      expect(result).toEqual(['Onion', 'Potato', 'Tomato']);
    });

    it('should return default products on API error', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API Error'));

      const result = await adapter.getSupportedProducts();

      expect(result).toContain('Rice');
      expect(result).toContain('Wheat');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('retry mechanism', () => {
    it('should retry on server errors', async () => {
      mockAxiosInstance.get
        .mockRejectedValueOnce(new Error('Server Error'))
        .mockRejectedValueOnce(new Error('Server Error'))
        .mockResolvedValue({
          status: 200,
          data: { records: [] }
        });

      const result = await adapter.fetchMandiPrices('Delhi', new Date());

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
      expect(result).toEqual([]);
    });

    it('should not retry on client errors', async () => {
      const clientError = new Error('Client Error');
      (clientError as any).name = 'AxiosError';
      (clientError as any).response = { status: 400 };
      (clientError as any).isAxiosError = true;
      
      // Mock isAxiosError to return true for our client error
      mockedIsAxiosError.mockReturnValue(true);
      
      mockAxiosInstance.get.mockRejectedValue(clientError);

      const result = await adapter.fetchMandiPrices('Delhi', new Date());

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });
  });
});