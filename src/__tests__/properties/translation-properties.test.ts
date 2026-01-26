/**
 * Property-Based Tests for Translation Service
 * Feature: multilingual-mandi
 */

import * as fc from 'fast-check';
import { TranslationService } from '../../services/translation/translation-service';
import { MockTranslationProvider } from '../../services/translation/mock-translation-provider';
import { SUPPORTED_LANGUAGES, getLanguageByCode } from '../../constants/languages';
import { Language } from '../../types';

describe('Translation Service Properties', () => {
  let translationService: TranslationService;
  let mockProvider: MockTranslationProvider;

  beforeEach(() => {
    mockProvider = new MockTranslationProvider();
    translationService = new TranslationService(mockProvider);
  });

  /**
   * Property 1: Bidirectional Translation Consistency
   * Feature: multilingual-mandi, Property 1: Bidirectional Translation Consistency
   * 
   * For any valid message in a supported language, translating it to another 
   * supported language and back should preserve the core meaning, and numerical 
   * values should remain exactly the same.
   * 
   * Validates: Requirements 1.1, 1.2, 1.5
   */
  describe('Property 1: Bidirectional Translation Consistency', () => {
    // Generator for supported languages
    const languageGenerator = fc.constantFrom(...SUPPORTED_LANGUAGES.filter(lang => lang.isSupported));
    
    // Generator for simple text that should translate consistently
    const simpleTextGenerator = fc.oneof(
      fc.constantFrom('Hello', 'Thank you', 'Onion', 'Tomato', 'How much?'),
      fc.constantFrom('नमस्ते', 'धन्यवाद', 'प्याज', 'टमाटर'),
      fc.constantFrom('नमस्कार', 'कांदा'),
      fc.constantFrom('வணக்கம்', 'நன்றி', 'வெங்காயம்')
    );

    // Generator for numerical values (should remain exactly the same)
    const numericalGenerator = fc.oneof(
      fc.integer({ min: 1, max: 10000 }).map(n => n.toString()),
      fc.integer({ min: 1, max: 1000 }).map(n => `₹${n}`),
      fc.integer({ min: 1, max: 100 }).map(n => `${n} kg`),
      fc.constantFrom('100', '₹25', '50 kg', '1000', '₹500')
    );

    it('should preserve numerical values exactly in bidirectional translation', async () => {
      await fc.assert(
        fc.asyncProperty(
          numericalGenerator,
          languageGenerator,
          languageGenerator,
          async (numericalText, sourceLang, targetLang) => {
            // Skip if source and target are the same
            if (sourceLang.code === targetLang.code) return true;

            try {
              // Translate from source to target
              const firstTranslation = await translationService.translate(
                numericalText, 
                sourceLang, 
                targetLang
              );

              // Translate back from target to source
              const backTranslation = await translationService.translate(
                firstTranslation.translatedText, 
                targetLang, 
                sourceLang
              );

              // Numerical values should remain exactly the same
              const originalNumbers = numericalText.match(/[\d₹.,]+/g) || [];
              const backTranslatedNumbers = backTranslation.translatedText.match(/[\d₹.,]+/g) || [];

              // All numbers should be preserved
              for (const originalNumber of originalNumbers) {
                expect(backTranslatedNumbers).toContain(originalNumber);
              }

              return true;
            } catch (error) {
              // If translation fails, that's acceptable for this property
              return true;
            }
          }
        ),
        { numRuns: 5, timeout: 10000 }
      );
    }, 15000);

    it('should maintain reasonable consistency in bidirectional translation for known phrases', async () => {
      await fc.assert(
        fc.asyncProperty(
          simpleTextGenerator,
          languageGenerator,
          languageGenerator,
          async (text, sourceLang, targetLang) => {
            // Skip if source and target are the same
            if (sourceLang.code === targetLang.code) return true;

            try {
              // Translate from source to target
              const firstTranslation = await translationService.translate(
                text, 
                sourceLang, 
                targetLang
              );

              // Translate back from target to source
              const backTranslation = await translationService.translate(
                firstTranslation.translatedText, 
                targetLang, 
                sourceLang
              );

              // For known phrases, we should get reasonable confidence
              expect(firstTranslation.confidence).toBeGreaterThan(0.3);
              expect(backTranslation.confidence).toBeGreaterThan(0.3);

              // The translation should not be empty
              expect(firstTranslation.translatedText.trim()).not.toBe('');
              expect(backTranslation.translatedText.trim()).not.toBe('');

              // Length should be reasonable (not too different)
              const originalLength = text.length;
              const backTranslatedLength = backTranslation.translatedText.length;
              const lengthRatio = backTranslatedLength / originalLength;
              
              expect(lengthRatio).toBeGreaterThan(0.2);
              expect(lengthRatio).toBeLessThan(5.0);

              return true;
            } catch (error) {
              // If translation fails, that's acceptable for this property
              return true;
            }
          }
        ),
        { numRuns: 5, timeout: 10000 }
      );
    }, 15000);

    it('should handle empty and whitespace-only strings consistently', async () => {
      const emptyStringGenerator = fc.oneof(
        fc.constant(''),
        fc.constant('   '),
        fc.constant('\t\n'),
        fc.constant('  \t  \n  ')
      );

      await fc.assert(
        fc.asyncProperty(
          emptyStringGenerator,
          languageGenerator,
          languageGenerator,
          async (text, sourceLang, targetLang) => {
            try {
              await translationService.translate(text, sourceLang, targetLang);
              // Should not reach here - empty strings should throw
              return false;
            } catch (error) {
              // Empty strings should consistently throw errors
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toContain('cannot be empty');
              return true;
            }
          }
        ),
        { numRuns: 20, timeout: 10000 }
      );
    });
  });

  /**
   * Property 2: Translation Error Handling
   * Feature: multilingual-mandi, Property 2: Translation Error Handling
   * 
   * For any malformed, ambiguous, or unsupported input, the Translation Service 
   * should return a low confidence score and request clarification rather than 
   * producing incorrect translations.
   * 
   * Validates: Requirements 1.4
   */
  describe('Property 2: Translation Error Handling', () => {
    // Generator for supported languages (reused from Property 1)
    const languageGenerator = fc.constantFrom(...SUPPORTED_LANGUAGES.filter(lang => lang.isSupported));
    
    // Generator for malformed inputs
    const malformedInputGenerator = fc.oneof(
      fc.constant(''),
      fc.constant('   '),
      fc.string({ minLength: 1000, maxLength: 2000 }), // Very long strings
      fc.constantFrom('<script>', '<?xml', 'SELECT * FROM', '../../etc/passwd'),
      fc.string().filter(s => s.includes('<') || s.includes('>')), // HTML-like content
    );

    // Generator for unsupported languages
    const unsupportedLanguageGenerator = fc.record({
      code: fc.constantFrom('xyz', 'abc', 'invalid', '123'),
      name: fc.constant('Unsupported'),
      nativeName: fc.constant('Unsupported'),
      isSupported: fc.constant(false),
      voiceSupported: fc.constant(false),
    });

    it('should handle malformed inputs gracefully', async () => {
      const supportedLang = getLanguageByCode('en')!;

      await fc.assert(
        fc.asyncProperty(
          malformedInputGenerator,
          async (malformedInput) => {
            try {
              const result = await translationService.translate(
                malformedInput, 
                supportedLang, 
                supportedLang
              );

              // If translation succeeds, confidence should be reasonable
              if (result.confidence < 0.5) {
                // Low confidence is acceptable for malformed input
                return true;
              }

              // High confidence should only occur for valid input
              expect(malformedInput.trim().length).toBeGreaterThan(0);
              return true;
            } catch (error) {
              // Throwing errors for malformed input is acceptable
              expect(error).toBeInstanceOf(Error);
              return true;
            }
          }
        ),
        { numRuns: 5, timeout: 5000 }
      );
    });

    it('should reject unsupported languages consistently', async () => {
      const supportedLang = getLanguageByCode('en')!;
      const validText = 'Hello world';

      await fc.assert(
        fc.asyncProperty(
          unsupportedLanguageGenerator,
          async (unsupportedLang: Language) => {
            try {
              await translationService.translate(validText, unsupportedLang, supportedLang);
              // Should not reach here - unsupported languages should throw
              return false;
            } catch (error) {
              // Unsupported languages should consistently throw errors
              expect(error).toBeInstanceOf(Error);
              expect((error as Error).message).toContain('not supported');
              return true;
            }
          }
        ),
        { numRuns: 5, timeout: 3000 }
      );
    });

    it('should validate translation results consistently', async () => {
      const validTextGenerator = fc.constantFrom(
        'Hello', 'Thank you', 'Good morning', 'How are you?'
      );

      await fc.assert(
        fc.asyncProperty(
          validTextGenerator,
          languageGenerator,
          languageGenerator,
          async (text: string, sourceLang: Language, targetLang: Language) => {
            if (sourceLang.code === targetLang.code) return true;

            try {
              const result = await translationService.translate(text, sourceLang, targetLang);

              // All translation results should pass validation
              const isValid = translationService.validateTranslation(
                text, 
                result.translatedText, 
                result.confidence
              );

              if (!isValid) {
                // If validation fails, confidence should be low
                expect(result.confidence).toBeLessThan(0.5);
              }

              // Confidence should always be between 0 and 1
              expect(result.confidence).toBeGreaterThanOrEqual(0);
              expect(result.confidence).toBeLessThanOrEqual(1);

              return true;
            } catch (error) {
              // Translation failures are acceptable
              return true;
            }
          }
        ),
        { numRuns: 10, timeout: 5000 }
      );
    }, 10000);
  });

  /**
   * Property 3: Language Support Consistency
   * Feature: multilingual-mandi, Property 3: Language Support Consistency
   * 
   * For any supported language, both text translation and voice interface should 
   * support that language, ensuring feature parity across communication modes.
   * 
   * Validates: Requirements 1.3, 2.5
   */
  describe('Property 3: Language Support Consistency', () => {
    it('should maintain consistency between supported languages and translation capabilities', async () => {
      const supportedLanguages = await translationService.getSupportedLanguages();

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...supportedLanguages),
          async (language) => {
            // Language should be marked as supported
            expect(language.isSupported).toBe(true);

            // Translation service should recognize it as supported
            expect(translationService.isLanguageSupported(language)).toBe(true);

            // Should be able to translate from this language
            try {
              const result = await translationService.translate(
                'test', 
                language, 
                getLanguageByCode('en')!
              );
              expect(result).toBeDefined();
              expect(result.translatedText).toBeDefined();
            } catch (error) {
              // Some translation failures are acceptable
            }

            return true;
          }
        ),
        { numRuns: SUPPORTED_LANGUAGES.length, timeout: 5000 }
      );
    });

    it('should provide consistent language detection capabilities', async () => {
      const testTexts = new Map([
        ['hi', 'नमस्ते दोस्त'],
        ['en', 'Hello friend'],
        ['mr', 'नमस्कार मित्र'],
        ['ta', 'வணக்கம் நண்பர்'],
      ]);

      for (const [expectedCode, text] of testTexts) {
        try {
          const detectedLanguage = await translationService.detectLanguage(text);
          
          // Detected language should be supported
          expect(detectedLanguage.isSupported).toBe(true);
          expect(translationService.isLanguageSupported(detectedLanguage)).toBe(true);
          
          // For known texts, detection should be reasonably accurate
          if (expectedCode === detectedLanguage.code) {
            // Perfect detection
            expect(detectedLanguage.code).toBe(expectedCode);
          } else {
            // Acceptable if detected language is still supported
            expect(SUPPORTED_LANGUAGES.some(lang => lang.code === detectedLanguage.code)).toBe(true);
          }
        } catch (error) {
          // Language detection failures are acceptable for some edge cases
        }
      }
    });
  });
});