import { 
  Offer, 
  OfferAnalysis, 
  CounterOffer, 
  NegotiationStrategy, 
  NegotiationContext, 
  ResponseSuggestion,
  PriceInfo 
} from '../types';

/**
 * Negotiation Assistant Interface
 * Analyzes offers and provides AI-driven negotiation guidance
 */
export interface NegotiationAssistant {
  /**
   * Analyze a buyer's offer against market prices
   */
  analyzeOffer(offer: Offer, marketPrice: PriceInfo): Promise<OfferAnalysis>;

  /**
   * Generate a counter-offer based on analysis and strategy
   */
  generateCounterOffer(analysis: OfferAnalysis, strategy: NegotiationStrategy): Promise<CounterOffer>;

  /**
   * Suggest response text for vendor based on negotiation context
   */
  suggestResponse(context: NegotiationContext): Promise<ResponseSuggestion>;

  /**
   * Calculate profit margin for given cost and selling price
   */
  calculateProfitMargin(cost: number, sellingPrice: number): number;

  /**
   * Determine negotiation strategy based on context
   */
  determineStrategy(context: NegotiationContext): Promise<NegotiationStrategy>;

  /**
   * Detect urgency level from buyer messages
   */
  detectUrgency(messages: string[]): 'low' | 'medium' | 'high';
}