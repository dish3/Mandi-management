/**
 * Mock data generators for testing
 */

import { Language, ProductQuery, PriceInfo, Vendor, Buyer, Product } from '../types';

export const mockLanguage: Language = {
  code: 'hi',
  name: 'Hindi',
  nativeName: 'हिन्दी',
  isSupported: true,
  voiceSupported: true,
};

export const mockProductQuery: ProductQuery = {
  name: 'Onion',
  category: 'Vegetables',
  location: 'Mumbai',
  quantity: 100,
  unit: 'kg',
};

export const mockPriceInfo: PriceInfo = {
  current: 25.50,
  minimum: 20.00,
  maximum: 30.00,
  average: 25.00,
  confidence: 0.85,
  source: 'official' as const,
  lastUpdated: new Date(),
};

export const mockVendor: Vendor = {
  id: 'vendor-1',
  name: 'Ram Kumar',
  phoneNumber: '9876543210',
  preferredLanguage: mockLanguage,
  location: {
    state: 'Maharashtra',
    district: 'Mumbai',
    market: 'Crawford Market',
  },
  products: [],
  verificationStatus: 'verified',
  createdAt: new Date(),
  lastActive: new Date(),
};

export const mockBuyer: Buyer = {
  id: 'buyer-1',
  name: 'Priya Sharma',
  phoneNumber: '9123456789',
  preferredLanguage: mockLanguage,
  location: {
    state: 'Maharashtra',
    district: 'Mumbai',
    market: 'Local Market',
  },
  purchaseHistory: [],
  createdAt: new Date(),
};

export const mockProduct: Product = {
  id: 'product-1',
  vendorId: 'vendor-1',
  name: 'Fresh Onions',
  category: 'Vegetables',
  description: 'High quality fresh onions from local farm',
  unit: 'kg',
  availableQuantity: 500,
  basePrice: 25.00,
  images: [],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};