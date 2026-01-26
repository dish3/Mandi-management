import { TranslationService } from '../../../services/translation/translation-service';
import { MockTranslationProvider } from '../../../services/translation/mock-translation-provider';
import { mockLanguage } from '../../test-data';
import { getLanguageByCode } from '../../../constants/languages';

describe('TranslationService', () => {
  let translationService: TranslationService;
  let mockProvider: MockTranslationProvider;

  beforeEach(() => {
    mockProvider = new MockTranslationProvider();
    translationService = new TranslationService(mockProvider);
  });

  describe('translate', () => {
    it('should translate text between supported languages', async () => {
      const hindi = getLanguageByCode('hi')!;
      const english = getLanguageByCode('en')!;
      
      const result = await translationService.translate('नमस्ते', hindi, english);
      
      expect(result.translatedText).toBe('Hello');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.detectedSourceLanguage).toEqual(hindi);
    });

    it('should return original text when source and target languages are the same', async () => {
      const hindi = getLanguageByCode('hi')!;
      const text = 'नमस्ते';
      
      const result = await translationService.translate(text, hindi, hindi);
      
      expect(result.translatedText).toBe(text);
      expect(result.confidence).toBe(1.0);
    });

    it('should throw error for empty text', async () => {
      const hindi = getLanguageByCode('hi')!;
      const english = getLanguageByCode('en')!;
      
      await expect(translationService.translate('', hindi, english))
        .rejects.toThrow('Text to translate cannot be empty');
    });

    it('should throw error for unsupported source language', async () => {
      const unsupportedLang = { code: 'xyz', name: 'Unknown', nativeName: 'Unknown', isSupported: false, voiceSupported: false };
      const english = getLanguageByCode('en')!;
      
      await expect(translationService.translate('test', unsupportedLang, english))
        .rejects.toThrow('Source language xyz is not supported');
    });

    it('should cache translation results', async () => {
      const hindi = getLanguageByCode('hi')!;
      const english = getLanguageByCode('en')!;
      const text = 'नमस्ते';
      
      // First call
      const result1 = await translationService.translate(text, hindi, english);
      
      // Second call should use cache
      const result2 = await translationService.translate(text, hindi, english);
      
      expect(result1).toEqual(result2);
      expect(translationService.getCacheStats().size).toBeGreaterThan(0);
    });

    it('should sanitize input text', async () => {
      const hindi = getLanguageByCode('hi')!;
      const english = getLanguageByCode('en')!;
      const dirtyText = '  <script>नमस्ते</script>  ';
      
      const result = await translationService.translate(dirtyText, hindi, english);
      
      // The sanitized text "scriptनमस्ते/script" should get a mock translation
      expect(result.translatedText).toContain('[EN]');
      expect(result.translatedText).toContain('scriptनमस्ते/script');
    });
  });

  describe('detectLanguage', () => {
    it('should detect Hindi text', async () => {
      const result = await translationService.detectLanguage('नमस्ते');
      
      expect(result.code).toBe('hi');
      expect(result.name).toBe('Hindi');
    });

    it('should detect English text', async () => {
      const result = await translationService.detectLanguage('Hello world');
      
      expect(result.code).toBe('en');
      expect(result.name).toBe('English');
    });

    it('should throw error for empty text', async () => {
      await expect(translationService.detectLanguage(''))
        .rejects.toThrow('Text for language detection cannot be empty');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return list of supported languages', async () => {
      const languages = await translationService.getSupportedLanguages();
      
      expect(languages.length).toBeGreaterThan(0);
      expect(languages.every(lang => lang.isSupported)).toBe(true);
      
      // Should include major Indian languages
      const codes = languages.map(lang => lang.code);
      expect(codes).toContain('hi');
      expect(codes).toContain('en');
      expect(codes).toContain('mr');
      expect(codes).toContain('ta');
    });
  });

  describe('isLanguageSupported', () => {
    it('should return true for supported languages', () => {
      const hindi = getLanguageByCode('hi')!;
      expect(translationService.isLanguageSupported(hindi)).toBe(true);
    });

    it('should return false for unsupported languages', () => {
      const unsupportedLang = { code: 'xyz', name: 'Unknown', nativeName: 'Unknown', isSupported: false, voiceSupported: false };
      expect(translationService.isLanguageSupported(unsupportedLang)).toBe(false);
    });
  });

  describe('validateTranslation', () => {
    it('should validate good translation', () => {
      const isValid = translationService.validateTranslation('Hello', 'नमस्ते', 0.95);
      expect(isValid).toBe(true);
    });

    it('should reject translation with low confidence', () => {
      const isValid = translationService.validateTranslation('Hello', 'नमस्ते', 0.2);
      expect(isValid).toBe(false);
    });

    it('should reject empty translations', () => {
      const isValid = translationService.validateTranslation('Hello', '', 0.95);
      expect(isValid).toBe(false);
    });

    it('should reject translations with extreme length ratios', () => {
      const isValid = translationService.validateTranslation('Hi', 'This is a very long translation that seems unreasonable for such a short input', 0.95);
      expect(isValid).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      translationService.clearCache();
      expect(translationService.getCacheStats().size).toBe(0);
    });

    it('should provide cache statistics', () => {
      const stats = translationService.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.maxSize).toBe('number');
    });
  });
});