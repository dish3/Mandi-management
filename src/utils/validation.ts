import { ProductQuery, Language, Offer } from '../types';
import { isLanguageSupported } from '../constants/languages';

/**
 * Validation utilities for input data
 */

export function validateProductQuery(query: ProductQuery): string[] {
  const errors: string[] = [];

  if (!query.name || query.name.trim().length === 0) {
    errors.push('Product name is required');
  }

  if (!query.category || query.category.trim().length === 0) {
    errors.push('Product category is required');
  }

  if (!query.location || query.location.trim().length === 0) {
    errors.push('Location is required');
  }

  if (!query.quantity || query.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }

  if (!query.unit || query.unit.trim().length === 0) {
    errors.push('Unit is required');
  }

  return errors;
}

export function validateLanguage(language: Language): string[] {
  const errors: string[] = [];

  if (!language.code || language.code.trim().length === 0) {
    errors.push('Language code is required');
  }

  if (!isLanguageSupported(language.code)) {
    errors.push(`Language ${language.code} is not supported`);
  }

  return errors;
}

export function validateOffer(offer: Offer): string[] {
  const errors: string[] = [];

  if (!offer.productId || offer.productId.trim().length === 0) {
    errors.push('Product ID is required');
  }

  if (!offer.quantity || offer.quantity <= 0) {
    errors.push('Quantity must be greater than 0');
  }

  if (!offer.pricePerUnit || offer.pricePerUnit <= 0) {
    errors.push('Price per unit must be greater than 0');
  }

  if (!offer.buyerId || offer.buyerId.trim().length === 0) {
    errors.push('Buyer ID is required');
  }

  if (!['low', 'medium', 'high'].includes(offer.urgencyLevel)) {
    errors.push('Urgency level must be low, medium, or high');
  }

  return errors;
}

export function validatePhoneNumber(phoneNumber: string): boolean {
  // Indian phone number validation (10 digits)
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phoneNumber);
}

export function validatePrice(price: number): boolean {
  return price > 0 && price < 1000000; // Reasonable price range
}

export function sanitizeText(text: string): string {
  return text.trim().replace(/[<>]/g, '');
}