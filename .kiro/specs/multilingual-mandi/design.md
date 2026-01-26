# Design Document: Multilingual Mandi Platform

## Overview

The Multilingual Mandi platform is a web-based application that enables seamless multilingual communication and AI-powered price discovery for local vendors and buyers. The system integrates real-time translation services, voice interfaces, market data APIs, and AI-driven negotiation assistance to create a comprehensive trading platform.

The platform follows a microservices architecture with clear separation between the web frontend, API gateway, core business services, and external AI/data services. This design ensures scalability, maintainability, and the ability to integrate with various third-party services for translation, speech processing, and market data.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Application]
        MOBILE[Mobile Browser]
    end
    
    subgraph "API Gateway"
        GATEWAY[API Gateway/Load Balancer]
    end
    
    subgraph "Core Services"
        AUTH[Authentication Service]
        COMM[Communication Service]
        PRICE[Price Discovery Service]
        NEG[Negotiation Assistant Service]
        USER[User Management Service]
    end
    
    subgraph "AI Services"
        TRANS[Translation Service]
        VOICE[Voice Processing Service]
        MARKET[Market Analysis Service]
    end
    
    subgraph "Data Layer"
        REDIS[Redis Cache]
        POSTGRES[PostgreSQL Database]
        FILES[File Storage]
    end
    
    subgraph "External APIs"
        MANDI[Government Mandi APIs]
        LLM[LLM Services (OpenAI/AWS)]
        SPEECH[Speech Services (AWS/Google)]
    end
    
    WEB --> GATEWAY
    MOBILE --> GATEWAY
    GATEWAY --> AUTH
    GATEWAY --> COMM
    GATEWAY --> PRICE
    GATEWAY --> NEG
    GATEWAY --> USER
    
    COMM --> TRANS
    COMM --> REDIS
    PRICE --> MARKET
    PRICE --> MANDI
    NEG --> LLM
    VOICE --> SPEECH
    
    AUTH --> POSTGRES
    USER --> POSTGRES
    COMM --> POSTGRES
    PRICE --> POSTGRES
    
    TRANS --> LLM
    MARKET --> LLM
```

### Service Responsibilities

**Communication Service**: Manages real-time messaging, conversation history, and message routing between buyers and vendors. Integrates with Translation Service for multilingual support.

**Price Discovery Service**: Fetches real-time market data from government APIs and provides AI-based price estimation when official data is unavailable. Maintains historical price data and trend analysis.

**Negotiation Assistant Service**: Analyzes buyer offers, generates negotiation strategies, and provides culturally appropriate response suggestions using LLM integration.

**Translation Service**: Provides real-time text translation between supported Indian languages using external LLM or cloud translation APIs.

**Voice Processing Service**: Handles speech-to-text and text-to-speech conversion for the voice interface, supporting multiple Indian languages.

## Components and Interfaces

### Core Components

#### Communication Engine
```typescript
interface CommunicationEngine {
  sendMessage(sessionId: string, message: Message): Promise<void>
  translateMessage(message: Message, targetLanguage: Language): Promise<TranslatedMessage>
  createNegotiationSession(vendorId: string, buyerId: string): Promise<SessionId>
  getConversationHistory(sessionId: string): Promise<Message[]>
}

interface Message {
  id: string
  sessionId: string
  senderId: string
  content: string
  language: Language
  timestamp: Date
  messageType: 'text' | 'voice' | 'offer'
}
```

#### Price Discovery Engine
```typescript
interface PriceDiscoveryEngine {
  getCurrentPrice(product: ProductQuery): Promise<PriceInfo>
  getPriceHistory(product: ProductQuery, days: number): Promise<PriceHistory>
  estimatePrice(product: ProductQuery): Promise<EstimatedPrice>
  getMarketSentiment(product: ProductQuery): Promise<MarketSentiment>
}

interface ProductQuery {
  name: string
  category: string
  location: string
  quantity: number
  unit: string
}

interface PriceInfo {
  current: number
  minimum: number
  maximum: number
  average: number
  confidence: number
  source: 'official' | 'estimated'
  lastUpdated: Date
}
```

#### Negotiation Assistant
```typescript
interface NegotiationAssistant {
  analyzeOffer(offer: Offer, marketPrice: PriceInfo): Promise<OfferAnalysis>
  generateCounterOffer(analysis: OfferAnalysis, strategy: NegotiationStrategy): Promise<CounterOffer>
  suggestResponse(context: NegotiationContext): Promise<ResponseSuggestion>
  calculateProfitMargin(cost: number, sellingPrice: number): number
}

interface Offer {
  productId: string
  quantity: number
  pricePerUnit: number
  buyerId: string
  urgencyLevel: 'low' | 'medium' | 'high'
}

interface OfferAnalysis {
  category: 'fair' | 'low' | 'high'
  deviation: number
  recommendation: string
  confidence: number
}
```

#### Voice Interface
```typescript
interface VoiceInterface {
  speechToText(audioData: ArrayBuffer, language: Language): Promise<string>
  textToSpeech(text: string, language: Language): Promise<ArrayBuffer>
  detectLanguage(audioData: ArrayBuffer): Promise<Language>
  validateAudioQuality(audioData: ArrayBuffer): Promise<QualityScore>
}
```

### External Service Interfaces

#### Translation Service Integration
```typescript
interface TranslationServiceAdapter {
  translate(text: string, from: Language, to: Language): Promise<TranslationResult>
  detectLanguage(text: string): Promise<Language>
  getSupportedLanguages(): Promise<Language[]>
}

interface TranslationResult {
  translatedText: string
  confidence: number
  detectedSourceLanguage?: Language
}
```

#### Market Data Integration
```typescript
interface MarketDataAdapter {
  fetchMandiPrices(location: string, date: Date): Promise<MandiPrice[]>
  getHistoricalData(product: string, location: string, days: number): Promise<HistoricalPrice[]>
  validateDataFreshness(data: MandiPrice): boolean
}
```

## Data Models

### User and Authentication Models

```typescript
interface Vendor {
  id: string
  name: string
  phoneNumber: string
  preferredLanguage: Language
  location: Location
  products: Product[]
  verificationStatus: 'pending' | 'verified' | 'rejected'
  createdAt: Date
  lastActive: Date
}

interface Buyer {
  id: string
  name: string
  phoneNumber: string
  preferredLanguage: Language
  location: Location
  purchaseHistory: Purchase[]
  createdAt: Date
}

interface Location {
  state: string
  district: string
  market: string
  coordinates?: {
    latitude: number
    longitude: number
  }
}
```

### Product and Pricing Models

```typescript
interface Product {
  id: string
  vendorId: string
  name: string
  category: string
  description: string
  unit: string
  availableQuantity: number
  basePrice: number
  images: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

interface PriceHistory {
  productId: string
  location: string
  prices: PricePoint[]
  trend: 'rising' | 'falling' | 'stable'
  volatility: number
}

interface PricePoint {
  date: Date
  price: number
  volume: number
  source: string
}
```

### Communication Models

```typescript
interface NegotiationSession {
  id: string
  vendorId: string
  buyerId: string
  productId: string
  status: 'active' | 'completed' | 'cancelled'
  messages: Message[]
  finalAgreedPrice?: number
  createdAt: Date
  completedAt?: Date
}

interface TranslatedMessage extends Message {
  originalContent: string
  originalLanguage: Language
  translationConfidence: number
}
```

### AI and Analytics Models

```typescript
interface NegotiationStrategy {
  type: 'aggressive' | 'moderate' | 'conservative'
  priceFlexibility: number
  timeConstraints: boolean
  culturalContext: string
}

interface MarketSentiment {
  product: string
  location: string
  sentiment: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  factors: string[]
  lastAnalyzed: Date
}

interface VendorAnalytics {
  vendorId: string
  totalNegotiations: number
  successRate: number
  averageProfitMargin: number
  preferredPriceRange: {
    min: number
    max: number
  }
  topProducts: string[]
}
```

### System Configuration Models

```typescript
interface Language {
  code: string // ISO 639-1 code
  name: string
  nativeName: string
  isSupported: boolean
  voiceSupported: boolean
}

interface SystemConfig {
  supportedLanguages: Language[]
  priceUpdateInterval: number
  maxConcurrentSessions: number
  translationTimeout: number
  voiceProcessingTimeout: number
  dataRetentionDays: number
}
```