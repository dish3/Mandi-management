import { ProductQuery, PriceInfo } from '../../types';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a ProductQuery object
 */
export function validateProductQuery(product: ProductQuery): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!product.name || typeof product.name !== 'string' || product.name.trim().length === 0) {
    errors.push('Product name is required and must be a non-empty string');
  }

  if (!product.category || typeof product.category !== 'string' || product.category.trim().length === 0) {
    errors.push('Product category is required and must be a non-empty string');
  }

  if (!product.location || typeof product.location !== 'string' || product.location.trim().length === 0) {
    errors.push('Location is required and must be a non-empty string');
  }

  if (!product.unit || typeof product.unit !== 'string' || product.unit.trim().length === 0) {
    errors.push('Unit is required and must be a non-empty string');
  }

  // Validate quantity
  if (typeof product.quantity !== 'number' || product.quantity <= 0) {
    errors.push('Quantity must be a positive number');
  }

  // Validate string lengths
  if (product.name && product.name.length > 100) {
    errors.push('Product name must be 100 characters or less');
  }

  if (product.category && product.category.length > 50) {
    errors.push('Product category must be 50 characters or less');
  }

  if (product.location && product.location.length > 100) {
    errors.push('Location must be 100 characters or less');
  }

  if (product.unit && product.unit.length > 20) {
    errors.push('Unit must be 20 characters or less');
  }

  // Validate quantity range
  if (product.quantity && (product.quantity > 1000000 || product.quantity < 0.001)) {
    errors.push('Quantity must be between 0.001 and 1,000,000');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates a PriceInfo object
 */
export function validatePriceData(priceInfo: PriceInfo): ValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (typeof priceInfo.current !== 'number' || priceInfo.current < 0) {
    errors.push('Current price must be a non-negative number');
  }

  if (typeof priceInfo.minimum !== 'number' || priceInfo.minimum < 0) {
    errors.push('Minimum price must be a non-negative number');
  }

  if (typeof priceInfo.maximum !== 'number' || priceInfo.maximum < 0) {
    errors.push('Maximum price must be a non-negative number');
  }

  if (typeof priceInfo.average !== 'number' || priceInfo.average < 0) {
    errors.push('Average price must be a non-negative number');
  }

  if (typeof priceInfo.confidence !== 'number' || priceInfo.confidence < 0 || priceInfo.confidence > 1) {
    errors.push('Confidence must be a number between 0 and 1');
  }

  // Validate source
  if (!priceInfo.source || !['official', 'estimated'].includes(priceInfo.source)) {
    errors.push('Source must be either "official" or "estimated"');
  }

  // Validate lastUpdated
  if (!(priceInfo.lastUpdated instanceof Date) || isNaN(priceInfo.lastUpdated.getTime())) {
    errors.push('LastUpdated must be a valid Date object');
  }

  // Logical validations
  if (priceInfo.minimum > priceInfo.maximum) {
    errors.push('Minimum price cannot be greater than maximum price');
  }

  if (priceInfo.current < priceInfo.minimum || priceInfo.current > priceInfo.maximum) {
    errors.push('Current price must be between minimum and maximum prices');
  }

  if (priceInfo.average < priceInfo.minimum || priceInfo.average > priceInfo.maximum) {
    errors.push('Average price must be between minimum and maximum prices');
  }

  // Check for reasonable price ranges (assuming prices in INR)
  const maxReasonablePrice = 100000; // 1 lakh INR per unit
  if (priceInfo.current > maxReasonablePrice || 
      priceInfo.minimum > maxReasonablePrice || 
      priceInfo.maximum > maxReasonablePrice || 
      priceInfo.average > maxReasonablePrice) {
    errors.push(`Prices seem unreasonably high (above ₹${maxReasonablePrice})`);
  }

  // Check for data freshness (warn if older than 24 hours)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (priceInfo.lastUpdated < twentyFourHoursAgo) {
    errors.push('Price data is older than 24 hours and may be stale');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates price range consistency
 */
export function validatePriceRange(min: number, max: number, current: number): ValidationResult {
  const errors: string[] = [];

  if (min > max) {
    errors.push('Minimum price cannot be greater than maximum price');
  }

  if (current < min) {
    errors.push('Current price cannot be less than minimum price');
  }

  if (current > max) {
    errors.push('Current price cannot be greater than maximum price');
  }

  // Check for reasonable spread (max shouldn't be more than 3x min for most products)
  if (max > min * 3) {
    errors.push('Price range seems unusually wide (max > 3x min)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates confidence score
 */
export function validateConfidence(confidence: number): ValidationResult {
  const errors: string[] = [];

  if (typeof confidence !== 'number') {
    errors.push('Confidence must be a number');
  } else if (confidence < 0 || confidence > 1) {
    errors.push('Confidence must be between 0 and 1');
  } else if (confidence === 0) {
    errors.push('Confidence cannot be exactly 0');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates product category
 */
export function validateProductCategory(category: string): ValidationResult {
  const errors: string[] = [];
  
  const validCategories = [
    'vegetables', 'fruits', 'grains', 'pulses', 'spices', 
    'dairy', 'meat', 'fish', 'oils', 'nuts', 'herbs'
  ];

  if (!category || typeof category !== 'string') {
    errors.push('Category must be a non-empty string');
  } else if (!validCategories.includes(category.toLowerCase())) {
    errors.push(`Category must be one of: ${validCategories.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates unit of measurement
 */
export function validateUnit(unit: string): ValidationResult {
  const errors: string[] = [];
  
  const validUnits = [
    'kg', 'gram', 'quintal', 'ton', 'liter', 'ml', 
    'piece', 'dozen', 'bag', 'box', 'bundle'
  ];

  if (!unit || typeof unit !== 'string') {
    errors.push('Unit must be a non-empty string');
  } else if (!validUnits.includes(unit.toLowerCase())) {
    errors.push(`Unit must be one of: ${validUnits.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}