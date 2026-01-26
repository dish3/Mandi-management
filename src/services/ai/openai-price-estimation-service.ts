import { AIService, MarketContext, TrendAnalysis, AIEstimationMethod } from '../../interfaces/ai-service';
import { ProductQuery, PricePoint, EstimatedPrice, MarketSentiment } from '../../types';
import { logger } from '../../utils/logger';
import { config } from '../../config';
import axios, { AxiosInstance } from 'axios';

/**
 * OpenAI-based Price Estimation Service
 * Uses GPT models for intelligent price estimation and market analysis
 */
export class OpenAIPriceEstimationService implements AIService {
  private client: AxiosInstance;
  private readonly model: string = 'gpt-3.5-turbo';
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 1000;

  constructor(apiKey?: string) {
    const key = apiKey || config.apiKeys.openai;
    if (!key) {
      throw new Error('OpenAI API key is required for AI price estimation');
    }

    this.client = axios.create({
      baseURL: 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds timeout
    });
  }

  async estimatePriceWithAI(
    product: ProductQuery,
    historicalData: PricePoint[],
    marketContext?: MarketContext
  ): Promise<EstimatedPrice> {
    logger.info('AI price estimation started', { 
      product: product.name, 
      historicalDataPoints: historicalData.length 
    });

    const method = this.selectEstimationMethod(historicalData, marketContext);
    const prompt = this.buildPriceEstimationPrompt(product, historicalData, marketContext, method);

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.client.post('/chat/completions', {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.2, // Low temperature for consistent estimates
        });

        const aiResponse = response.data.choices[0]?.message?.content?.trim();
        if (!aiResponse) {
          throw new Error('Empty response from OpenAI');
        }

        const estimatedPrice = this.parseAIResponse(aiResponse, product, method);
        const confidence = await this.calculateConfidenceScore(product, historicalData, method);

        // Apply confidence to the estimate
        estimatedPrice.confidence = confidence;

        logger.info('AI price estimation completed', {
          product: product.name,
          estimatedPrice: estimatedPrice.current,
          confidence,
          method
        });

        return estimatedPrice;

      } catch (error) {
        logger.error(`AI price estimation attempt ${attempt} failed:`, error);
        
        if (attempt === this.maxRetries) {
          throw new Error(`AI price estimation failed after ${this.maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        await this.delay(this.retryDelay * attempt);
      }
    }

    throw new Error('AI price estimation failed - should not reach here');
  }

  async analyzeMarketTrends(
    product: ProductQuery,
    historicalData: PricePoint[]
  ): Promise<TrendAnalysis> {
    logger.info('AI trend analysis started', { 
      product: product.name, 
      dataPoints: historicalData.length 
    });

    const prompt = this.buildTrendAnalysisPrompt(product, historicalData);

    try {
      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a market analyst specializing in agricultural commodities in India. Analyze price trends and provide insights in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 600,
        temperature: 0.1,
      });

      const aiResponse = response.data.choices[0]?.message?.content?.trim();
      if (!aiResponse) {
        throw new Error('Empty response from OpenAI');
      }

      const trendAnalysis = this.parseTrendAnalysisResponse(aiResponse);
      
      logger.info('AI trend analysis completed', {
        product: product.name,
        trend: trendAnalysis.trend,
        confidence: trendAnalysis.confidence
      });

      return trendAnalysis;

    } catch (error) {
      logger.error('AI trend analysis failed:', error);
      throw new Error(`Trend analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateMarketSentiment(
    product: ProductQuery,
    priceHistory: PricePoint[],
    externalFactors?: string[]
  ): Promise<MarketSentiment> {
    logger.info('AI sentiment analysis started', { 
      product: product.name,
      externalFactors: externalFactors?.length || 0
    });

    const prompt = this.buildSentimentAnalysisPrompt(product, priceHistory, externalFactors);

    try {
      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a market sentiment analyst for Indian agricultural markets. Analyze market conditions and sentiment in JSON format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      });

      const aiResponse = response.data.choices[0]?.message?.content?.trim();
      if (!aiResponse) {
        throw new Error('Empty response from OpenAI');
      }

      const sentiment = this.parseSentimentResponse(aiResponse, product);
      
      logger.info('AI sentiment analysis completed', {
        product: product.name,
        sentiment: sentiment.sentiment,
        confidence: sentiment.confidence
      });

      return sentiment;

    } catch (error) {
      logger.error('AI sentiment analysis failed:', error);
      throw new Error(`Sentiment analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async calculateConfidenceScore(
    product: ProductQuery,
    historicalData: PricePoint[],
    estimationMethod: string
  ): Promise<number> {
    let confidence = 0.5; // Base confidence

    // Data availability factor
    if (historicalData.length >= 30) {
      confidence += 0.2;
    } else if (historicalData.length >= 10) {
      confidence += 0.1;
    } else if (historicalData.length < 3) {
      confidence -= 0.2;
    }

    // Data recency factor
    const mostRecentData = historicalData[historicalData.length - 1];
    if (mostRecentData) {
      const daysSinceLastData = Math.floor(
        (Date.now() - mostRecentData.date.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceLastData <= 7) {
        confidence += 0.15;
      } else if (daysSinceLastData <= 30) {
        confidence += 0.05;
      } else {
        confidence -= 0.1;
      }
    }

    // Estimation method factor
    switch (estimationMethod) {
      case 'llm_with_historical':
        confidence += 0.1;
        break;
      case 'llm_seasonal_adjusted':
        confidence += 0.05;
        break;
      case 'llm_category_based':
        confidence -= 0.1;
        break;
    }

    // Data consistency factor
    if (historicalData.length > 1) {
      const prices = historicalData.map(d => d.price);
      const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
      const coefficientOfVariation = Math.sqrt(variance) / mean;
      
      if (coefficientOfVariation < 0.2) {
        confidence += 0.1; // Low volatility increases confidence
      } else if (coefficientOfVariation > 0.5) {
        confidence -= 0.15; // High volatility decreases confidence
      }
    }

    // Ensure confidence is within bounds
    return Math.max(0.1, Math.min(0.9, confidence));
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.post('/chat/completions', {
        model: this.model,
        messages: [{ role: 'user', content: 'Health check' }],
        max_tokens: 5,
      });
      
      return response.status === 200;
    } catch (error) {
      logger.error('OpenAI AI service health check failed:', error);
      return false;
    }
  }

  // Private helper methods

  private selectEstimationMethod(
    historicalData: PricePoint[],
    marketContext?: MarketContext
  ): AIEstimationMethod {
    if (historicalData.length >= 10) {
      if (marketContext?.seasonality && marketContext.seasonality !== 'normal') {
        return 'llm_seasonal_adjusted';
      }
      return 'llm_with_historical';
    } else if (historicalData.length >= 3) {
      return 'llm_market_sentiment';
    } else {
      return 'llm_category_based';
    }
  }

  private getSystemPrompt(): string {
    return `You are an expert agricultural market analyst specializing in Indian commodity markets. 
Your task is to provide accurate price estimates for agricultural products based on historical data, 
market conditions, and seasonal patterns.

Key principles:
- Consider seasonal variations in Indian agriculture
- Account for regional price differences
- Factor in supply-demand dynamics
- Consider weather patterns and their impact
- Be aware of festival seasons affecting demand
- Provide realistic price ranges with proper justification

Always respond in valid JSON format with the required fields.`;
  }

  private buildPriceEstimationPrompt(
    product: ProductQuery,
    historicalData: PricePoint[],
    marketContext?: MarketContext,
    method?: AIEstimationMethod
  ): string {
    let prompt = `Estimate the current market price for ${product.name} (${product.category}) in ${product.location}.

Product Details:
- Name: ${product.name}
- Category: ${product.category}
- Location: ${product.location}
- Quantity: ${product.quantity} ${product.unit}

`;

    if (historicalData.length > 0) {
      prompt += `Historical Price Data (last ${historicalData.length} data points):\n`;
      historicalData.slice(-10).forEach(point => {
        prompt += `- ${point.date.toISOString().split('T')[0]}: ₹${point.price}/${product.unit} (Volume: ${point.volume})\n`;
      });
      prompt += '\n';
    }

    if (marketContext) {
      prompt += `Market Context:
- Seasonality: ${marketContext.seasonality}
- Weather Conditions: ${marketContext.weatherConditions || 'Normal'}
- Festival Season: ${marketContext.festivalSeason ? 'Yes' : 'No'}
`;
      
      if (marketContext.supplyDisruptions?.length) {
        prompt += `- Supply Disruptions: ${marketContext.supplyDisruptions.join(', ')}\n`;
      }
      
      if (marketContext.demandFactors?.length) {
        prompt += `- Demand Factors: ${marketContext.demandFactors.join(', ')}\n`;
      }
      
      prompt += '\n';
    }

    prompt += `Please provide a price estimate in the following JSON format:
{
  "current": <estimated_current_price>,
  "minimum": <minimum_expected_price>,
  "maximum": <maximum_expected_price>,
  "average": <average_price>,
  "reasoning": "<explanation_for_the_estimate>",
  "factors": ["<factor1>", "<factor2>", "<factor3>"]
}

Consider seasonal patterns, supply-demand dynamics, and regional market conditions in your analysis.`;

    return prompt;
  }

  private buildTrendAnalysisPrompt(product: ProductQuery, historicalData: PricePoint[]): string {
    let prompt = `Analyze the price trend for ${product.name} in ${product.location} based on the following historical data:

`;

    historicalData.forEach(point => {
      prompt += `${point.date.toISOString().split('T')[0]}: ₹${point.price} (Volume: ${point.volume})\n`;
    });

    prompt += `
Please analyze the trend and provide insights in the following JSON format:
{
  "trend": "<rising|falling|stable|volatile>",
  "confidence": <0.0_to_1.0>,
  "predictedDirection": "<up|down|stable>",
  "timeHorizon": <days_for_prediction>,
  "factors": ["<factor1>", "<factor2>", "<factor3>"],
  "reasoning": "<detailed_explanation>"
}`;

    return prompt;
  }

  private buildSentimentAnalysisPrompt(
    product: ProductQuery,
    priceHistory: PricePoint[],
    externalFactors?: string[]
  ): string {
    let prompt = `Analyze market sentiment for ${product.name} in ${product.location}.

Recent Price History:
`;

    priceHistory.slice(-7).forEach(point => {
      prompt += `${point.date.toISOString().split('T')[0]}: ₹${point.price}\n`;
    });

    if (externalFactors?.length) {
      prompt += `\nExternal Factors:\n`;
      externalFactors.forEach(factor => {
        prompt += `- ${factor}\n`;
      });
    }

    prompt += `
Provide sentiment analysis in JSON format:
{
  "sentiment": "<bullish|bearish|neutral>",
  "confidence": <0.0_to_1.0>,
  "factors": ["<factor1>", "<factor2>", "<factor3>"]
}`;

    return prompt;
  }

  private parseAIResponse(
    aiResponse: string,
    product: ProductQuery,
    method: AIEstimationMethod
  ): EstimatedPrice {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        current: Number(parsed.current) || 0,
        minimum: Number(parsed.minimum) || Number(parsed.current) * 0.8,
        maximum: Number(parsed.maximum) || Number(parsed.current) * 1.2,
        average: Number(parsed.average) || Number(parsed.current),
        confidence: 0.7, // Will be updated by calculateConfidenceScore
        source: 'estimated',
        lastUpdated: new Date(),
        estimationMethod: method,
        historicalBasis: []
      };
    } catch (error) {
      logger.error('Failed to parse AI response:', { aiResponse, error });
      throw new Error('Invalid AI response format');
    }
  }

  private parseTrendAnalysisResponse(aiResponse: string): TrendAnalysis {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in trend analysis response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        trend: parsed.trend || 'stable',
        confidence: Number(parsed.confidence) || 0.5,
        predictedDirection: parsed.predictedDirection || 'stable',
        timeHorizon: Number(parsed.timeHorizon) || 7,
        factors: parsed.factors || [],
        reasoning: parsed.reasoning || 'No reasoning provided'
      };
    } catch (error) {
      logger.error('Failed to parse trend analysis response:', { aiResponse, error });
      throw new Error('Invalid trend analysis response format');
    }
  }

  private parseSentimentResponse(aiResponse: string, product: ProductQuery): MarketSentiment {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in sentiment response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        product: product.name,
        location: product.location,
        sentiment: parsed.sentiment || 'neutral',
        confidence: Number(parsed.confidence) || 0.5,
        factors: parsed.factors || [],
        lastAnalyzed: new Date()
      };
    } catch (error) {
      logger.error('Failed to parse sentiment response:', { aiResponse, error });
      throw new Error('Invalid sentiment response format');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}