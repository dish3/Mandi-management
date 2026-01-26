// Core Language and Location Types
export interface Language {
  code: string; // ISO 639-1 code
  name: string;
  nativeName: string;
  isSupported: boolean;
  voiceSupported: boolean;
}

export interface Location {
  state: string;
  district: string;
  market: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// User Models
export interface Vendor {
  id: string;
  name: string;
  phoneNumber: string;
  preferredLanguage: Language;
  location: Location;
  products: Product[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
  createdAt: Date;
  lastActive: Date;
}

export interface Buyer {
  id: string;
  name: string;
  phoneNumber: string;
  preferredLanguage: Language;
  location: Location;
  purchaseHistory: Purchase[];
  createdAt: Date;
}

// Product and Pricing Models
export interface Product {
  id: string;
  vendorId: string;
  name: string;
  category: string;
  description: string;
  unit: string;
  availableQuantity: number;
  basePrice: number;
  images: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductQuery {
  name: string;
  category: string;
  location: string;
  quantity: number;
  unit: string;
}

export interface PriceInfo {
  current: number;
  minimum: number;
  maximum: number;
  average: number;
  confidence: number;
  source: 'official' | 'estimated';
  lastUpdated: Date;
}

export interface PriceHistory {
  productId: string;
  location: string;
  prices: PricePoint[];
  trend: 'rising' | 'falling' | 'stable';
  volatility: number;
}

export interface PricePoint {
  date: Date;
  price: number;
  volume: number;
  source: string;
}

export interface EstimatedPrice extends PriceInfo {
  estimationMethod: string;
  historicalBasis: PricePoint[];
}

// Communication Models
export interface Message {
  id: string;
  sessionId: string;
  senderId: string;
  content: string;
  language: Language;
  timestamp: Date;
  messageType: 'text' | 'voice' | 'offer';
}

export interface TranslatedMessage extends Message {
  originalContent: string;
  originalLanguage: Language;
  translationConfidence: number;
}

export interface NegotiationSession {
  id: string;
  vendorId: string;
  buyerId: string;
  productId: string;
  status: 'active' | 'completed' | 'cancelled';
  messages: Message[];
  finalAgreedPrice?: number;
  createdAt: Date;
  completedAt?: Date;
}

// Negotiation Models
export interface Offer {
  productId: string;
  quantity: number;
  pricePerUnit: number;
  buyerId: string;
  urgencyLevel: 'low' | 'medium' | 'high';
}

export interface OfferAnalysis {
  category: 'fair' | 'low' | 'high';
  deviation: number;
  recommendation: string;
  confidence: number;
}

export interface CounterOffer {
  pricePerUnit: number;
  reasoning: string;
  confidence: number;
  strategy: string;
}

export interface NegotiationStrategy {
  type: 'aggressive' | 'moderate' | 'conservative';
  priceFlexibility: number;
  timeConstraints: boolean;
  culturalContext: string;
}

export interface NegotiationContext {
  currentOffer: Offer;
  marketPrice: PriceInfo;
  vendorHistory: VendorAnalytics;
  sessionHistory: Message[];
}

export interface ResponseSuggestion {
  suggestedResponse: string;
  reasoning: string;
  confidence: number;
  alternativeResponses: string[];
}

// AI and Analytics Models
export interface MarketSentiment {
  product: string;
  location: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  factors: string[];
  lastAnalyzed: Date;
}

export interface VendorAnalytics {
  vendorId: string;
  totalNegotiations: number;
  successRate: number;
  averageProfitMargin: number;
  preferredPriceRange: {
    min: number;
    max: number;
  };
  topProducts: string[];
}

// External Service Models
export interface TranslationResult {
  translatedText: string;
  confidence: number;
  detectedSourceLanguage?: Language;
}

export interface MandiPrice {
  product: string;
  location: string;
  price: number;
  date: Date;
  source: string;
  verified: boolean;
}

export interface HistoricalPrice {
  date: Date;
  price: number;
  volume: number;
  location: string;
}

export interface QualityScore {
  score: number; // 0-100
  issues: string[];
  recommendation: string;
}

// System Configuration
export interface SystemConfig {
  supportedLanguages: Language[];
  priceUpdateInterval: number;
  maxConcurrentSessions: number;
  translationTimeout: number;
  voiceProcessingTimeout: number;
  dataRetentionDays: number;
}

// Utility Types
export type SessionId = string;
export type UserId = string;
export type ProductId = string;
export type Purchase = {
  id: string;
  productId: string;
  vendorId: string;
  quantity: number;
  pricePerUnit: number;
  totalAmount: number;
  purchaseDate: Date;
};