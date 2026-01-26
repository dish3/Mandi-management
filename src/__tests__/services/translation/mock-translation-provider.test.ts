import { MockTranslationProvider } from '../../../services/translation/mock-translation-provider';
import { getLanguageByCode } from '../../../constants/languages';

describe('MockTranslationProvider', () => {
  let provider: MockTranslationProvider;

  beforeEach(() => {
    provider = new MockTranslationProvider();
  });

  describe('translate', () => {
    it('should translate known Hindi to English phrases', async () => {
      const hindi = getLanguageByCode('hi')!;
      const english = getLanguageByCode('en')!;
      
      const result = await provider.translate('नमस्ते', hindi, english);
      
      expect(result.translatedText).toBe('Hello');
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.detectedSourceLanguage).toEqual(hindi);
    });

    it('should translate known English to Hindi phrases', async () => {
      const hindi = getLanguageByCode('hi')!;
      const english = getLanguageByCode('en')!;
      
      const result = await provider.translate('Hello', english, hindi);
      
      expect(result.translatedText).toBe('नमस्ते');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should preserve numbers and currency', async () => {
      const hindi = getLanguageByCode('hi')!;
      const english = getLanguageByCode('en')!;
      
      const result = await provider.translate('₹100', hindi, english);
      
      expect(result.translatedText).toBe('₹100');
      expect(result.confidence).toBe(1.0);
    });

    it('should generate mock translation for unknown text', async () => {
      const hindi = getLanguageByCode('hi')!;
      const english = getLanguageByCode('en')!;
      
      const result = await provider.translate('unknown text', hindi, english);
      
      expect(result.translatedText).toContain('[EN]');
      expect(result.translatedText).toContain('unknown text');
      expect(result.confidence).toBe(0.75);
    });

    it('should handle cross-language translations', async () => {
      const hindi = getLanguageByCode('hi')!;
      const marathi = getLanguageByCode('mr')!;
      
      const result = await provider.translate('नमस्ते', hindi, marathi);
      
      expect(result.translatedText).toBe('नमस्कार');
      expect(result.confidence).toBeGreaterThan(0.9);
    });
  });

  describe('detectLanguage', () => {
    it('should detect Hindi text', async () => {
      const result = await provider.detectLanguage('नमस्ते दोस्त');
      expect(result).toBe('hi');
    });

    it('should detect English text', async () => {
      const result = await provider.detectLanguage('Hello friend');
      expect(result).toBe('en');
    });

    it('should detect Tamil text', async () => {
      const result = await provider.detectLanguage('வணக்கம் நண்பர்');
      expect(result).toBe('ta');
    });

    it('should default to English for unknown scripts', async () => {
      const result = await provider.detectLanguage('123 !@# unknown');
      expect(result).toBe('en');
    });
  });

  describe('mock translation management', () => {
    it('should allow adding custom mock translations', () => {
      provider.addMockTranslation('hi', 'en', 'test', 'परीक्षा');
      
      const translations = provider.getMockTranslations();
      expect(translations.get('hi-en-test')).toBe('परीक्षा');
    });

    it('should allow clearing mock translations', () => {
      provider.addMockTranslation('hi', 'en', 'test', 'परीक्षा');
      provider.clearMockTranslations();
      
      const translations = provider.getMockTranslations();
      expect(translations.size).toBe(0);
    });

    it('should return all mock translations', () => {
      const translations = provider.getMockTranslations();
      expect(translations.size).toBeGreaterThan(0);
      expect(translations.has('hi-en-नमस्ते')).toBe(true);
    });
  });

  describe('simulation behavior', () => {
    it('should simulate realistic delays', async () => {
      const start = Date.now();
      await provider.translate('test', getLanguageByCode('hi')!, getLanguageByCode('en')!);
      const duration = Date.now() - start;
      
      // Should take at least 200ms (minimum simulated delay)
      expect(duration).toBeGreaterThan(150);
    });

    it('should handle multiple concurrent translations', async () => {
      const hindi = getLanguageByCode('hi')!;
      const english = getLanguageByCode('en')!;
      
      const promises = [
        provider.translate('नमस्ते', hindi, english),
        provider.translate('धन्यवाद', hindi, english),
        provider.translate('प्याज', hindi, english),
      ];
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      expect(results[0].translatedText).toBe('Hello');
      expect(results[1].translatedText).toBe('Thank you');
      expect(results[2].translatedText).toBe('Onion');
    });
  });
});