import { PriceInfo, PriceHistory, EstimatedPrice } from '../../types';

/**
 * Formats price values to ensure consistency and proper precision
 */
export function formatPriceInfo(priceInfo: PriceInfo): PriceInfo {
  return {
    ...priceInfo,
    current: formatPrice(priceInfo.current),
    minimum: formatPrice(priceInfo.minimum),
    maximum: formatPrice(priceInfo.maximum),
    average: formatPrice(priceInfo.average),
    confidence: formatConfidence(priceInfo.confidence)
  };
}

/**
 * Formats a single price value to 2 decimal places
 */
export function formatPrice(price: number): number {
  if (typeof price !== 'number' || isNaN(price)) {
    throw new Error('Price must be a valid number');
  }
  
  if (price < 0) {
    throw new Error('Price cannot be negative');
  }
  
  return Math.round(price * 100) / 100;
}

/**
 * Formats confidence score to 2 decimal places
 */
export function formatConfidence(confidence: number): number {
  if (typeof confidence !== 'number' || isNaN(confidence)) {
    throw new Error('Confidence must be a valid number');
  }
  
  if (confidence < 0 || confidence > 1) {
    throw new Error('Confidence must be between 0 and 1');
  }
  
  return Math.round(confidence * 100) / 100;
}

/**
 * Formats price for display with currency symbol
 */
export function formatPriceForDisplay(price: number, currency: string = '₹'): string {
  const formattedPrice = formatPrice(price);
  
  // Add thousand separators for Indian numbering system
  const parts = formattedPrice.toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Indian numbering system: first comma after 3 digits, then every 2 digits
  let formattedInteger = '';
  const reversed = integerPart.split('').reverse();
  
  for (let i = 0; i < reversed.length; i++) {
    if (i === 3 || (i > 3 && (i - 3) % 2 === 0)) {
      formattedInteger = ',' + formattedInteger;
    }
    formattedInteger = reversed[i] + formattedInteger;
  }
  
  return `${currency}${formattedInteger}.${decimalPart}`;
}

/**
 * Formats price range for display
 */
export function formatPriceRange(min: number, max: number, currency: string = '₹'): string {
  const formattedMin = formatPriceForDisplay(min, currency);
  const formattedMax = formatPriceForDisplay(max, currency);
  return `${formattedMin} - ${formattedMax}`;
}

/**
 * Formats confidence as percentage
 */
export function formatConfidenceAsPercentage(confidence: number): string {
  const percentage = Math.round(confidence * 100);
  return `${percentage}%`;
}

/**
 * Formats price change as percentage
 */
export function formatPriceChange(oldPrice: number, newPrice: number): {
  change: number;
  percentage: number;
  formatted: string;
} {
  if (oldPrice <= 0) {
    throw new Error('Old price must be positive');
  }
  
  const change = newPrice - oldPrice;
  const percentage = (change / oldPrice) * 100;
  const isPositive = change >= 0;
  const sign = isPositive ? '+' : '-';
  const percentageSign = isPositive ? '+' : '';
  
  return {
    change: formatPrice(Math.abs(change)),
    percentage: Math.round(percentage * 100) / 100,
    formatted: `${sign}${formatPrice(Math.abs(change)).toFixed(2)} (${percentageSign}${Math.round(percentage * 100) / 100}%)`
  };
}

/**
 * Formats price history for display
 */
export function formatPriceHistory(priceHistory: PriceHistory): {
  formattedPrices: Array<{
    date: string;
    price: string;
    volume: string;
  }>;
  trend: string;
  volatility: string;
} {
  const formattedPrices = priceHistory.prices.map(point => ({
    date: point.date.toLocaleDateString('en-IN'),
    price: formatPriceForDisplay(point.price),
    volume: formatVolume(point.volume)
  }));
  
  const trendDisplay = {
    'rising': '📈 Rising',
    'falling': '📉 Falling',
    'stable': '➡️ Stable'
  };
  
  return {
    formattedPrices,
    trend: trendDisplay[priceHistory.trend] || priceHistory.trend,
    volatility: `${Math.round(priceHistory.volatility * 100)}%`
  };
}

/**
 * Formats volume with appropriate units
 */
export function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `${Math.round(volume / 1000000 * 100) / 100}M`;
  } else if (volume >= 1000) {
    return `${Math.round(volume / 1000 * 100) / 100}K`;
  } else {
    return volume.toString();
  }
}

/**
 * Formats estimated price with estimation details
 */
export function formatEstimatedPrice(estimatedPrice: EstimatedPrice): {
  priceInfo: PriceInfo;
  estimationDetails: {
    method: string;
    confidence: string;
    basedOn: string;
  };
} {
  const methodDisplayNames: Record<string, string> = {
    'historical_average_with_trend': 'Historical Average with Trend Analysis',
    'category_baseline': 'Category Baseline Estimation',
    'market_comparison': 'Market Comparison Analysis',
    'ai_prediction': 'AI-Based Prediction'
  };
  
  return {
    priceInfo: formatPriceInfo(estimatedPrice),
    estimationDetails: {
      method: methodDisplayNames[estimatedPrice.estimationMethod] || estimatedPrice.estimationMethod,
      confidence: formatConfidenceAsPercentage(estimatedPrice.confidence),
      basedOn: `${estimatedPrice.historicalBasis.length} historical data points`
    }
  };
}

/**
 * Formats price comparison between two prices
 */
export function formatPriceComparison(price1: number, price2: number, label1: string, label2: string): {
  comparison: string;
  difference: string;
  recommendation: string;
} {
  const diff = price2 - price1;
  const percentDiff = Math.abs(diff / price1) * 100;
  
  let comparison: string;
  let recommendation: string;
  
  if (Math.abs(diff) < 0.01) {
    comparison = `${label1} and ${label2} are essentially the same`;
    recommendation = 'Prices are comparable';
  } else if (diff > 0) {
    comparison = `${label2} is ${formatPriceForDisplay(diff)} higher than ${label1}`;
    recommendation = percentDiff > 20 ? 'Significant price difference' : 'Moderate price difference';
  } else {
    comparison = `${label2} is ${formatPriceForDisplay(Math.abs(diff))} lower than ${label1}`;
    recommendation = percentDiff > 20 ? 'Good value opportunity' : 'Slight price advantage';
  }
  
  return {
    comparison,
    difference: formatPriceChange(price1, price2).formatted,
    recommendation
  };
}

/**
 * Formats price summary for quick overview
 */
export function formatPriceSummary(priceInfo: PriceInfo): {
  current: string;
  range: string;
  confidence: string;
  source: string;
  lastUpdated: string;
} {
  return {
    current: formatPriceForDisplay(priceInfo.current),
    range: formatPriceRange(priceInfo.minimum, priceInfo.maximum),
    confidence: formatConfidenceAsPercentage(priceInfo.confidence),
    source: priceInfo.source === 'official' ? '🏛️ Official' : '🤖 Estimated',
    lastUpdated: priceInfo.lastUpdated.toLocaleString('en-IN')
  };
}

/**
 * Validates and formats price input from user
 */
export function parseAndFormatUserPrice(input: string | number): number {
  let price: number;
  
  if (typeof input === 'string') {
    // Remove currency symbols and commas
    const cleaned = input.replace(/[₹$,\s]/g, '');
    price = parseFloat(cleaned);
  } else {
    price = input;
  }
  
  if (isNaN(price) || price < 0) {
    throw new Error('Invalid price format');
  }
  
  return formatPrice(price);
}