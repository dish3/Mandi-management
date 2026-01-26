/**
 * Test setup and configuration
 */

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://localhost:5432/multilingual_mandi_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// Global test utilities
export const testConfig = {
  timeout: 10000,
  retries: 2,
};

// Dummy test to prevent Jest from failing
describe('Test Setup', () => {
  it('should load test configuration', () => {
    expect(testConfig.timeout).toBe(10000);
  });
});

// Mock data generators for testing
export const mockLanguage = {
  code: 'hi',
  name: 'Hindi',
  nativeName: 'हिन्दी',
  isSupported: true,
  voiceSupported: true,
};

export const mockProductQuery = {
  name: 'Onion',
  category: 'Vegetables',
  location: 'Mumbai',
  quantity: 100,
  unit: 'kg',
};

export const mockPriceInfo = {
  current: 25.50,
  minimum: 20.00,
  maximum: 30.00,
  average: 25.00,
  confidence: 0.85,
  source: 'official' as const,
  lastUpdated: new Date(),
};