import { MockVoiceProvider } from '../../../services/voice/mock-voice-provider';
import { Language } from '../../../types';
import { SUPPORTED_LANGUAGES } from '../../../constants/languages';

describe('MockVoiceProvider', () => {
  let mockProvider: MockVoiceProvider;
  let mockAudioData: ArrayBuffer;
  let testLanguage: Language;

  beforeEach(() => {
    mockProvider = new MockVoiceProvider();
    
    // Create mock audio data
    mockAudioData = new ArrayBuffer(2000);
    const view = new Uint8Array(mockAudioData);
    for (let i = 0; i < view.length; i++) {
      view[i] = Math.floor(Math.random() * 256);
    }

    // Use English as test language
    testLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === 'en')!;
  });

  describe('speechToText', () => {
    it('should return mock text for valid input', async () => {
      const result = await mockProvider.speechToText(mockAudioData, testLanguage);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toBe('Welcome'); // Expected mock response for English
    });

    it('should return language-specific responses', async () => {
      const hindiLang = SUPPORTED_LANGUAGES.find(lang => lang.code === 'hi')!;
      const result = await mockProvider.speechToText(mockAudioData, hindiLang);
      
      expect(result).toBe('आपका स्वागत है');
    });

    it('should throw error for empty audio data', async () => {
      const emptyAudio = new ArrayBuffer(0);
      
      await expect(mockProvider.speechToText(emptyAudio, testLanguage))
        .rejects.toThrow('Audio data is empty');
    });

    it('should throw error for unsupported language', async () => {
      const unsupportedLanguage: Language = {
        code: 'xx',
        name: 'Unsupported',
        nativeName: 'Unsupported',
        isSupported: false,
        voiceSupported: false
      };

      await expect(mockProvider.speechToText(mockAudioData, unsupportedLanguage))
        .rejects.toThrow('Language xx not supported for voice processing');
    });

    it('should have consistent response times', async () => {
      const startTime = Date.now();
      await mockProvider.speechToText(mockAudioData, testLanguage);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeGreaterThan(50); // Should have some simulated delay
      expect(duration).toBeLessThan(1000); // But not too long
    });
  });

  describe('textToSpeech', () => {
    it('should return mock audio for valid input', async () => {
      const text = 'Hello world';
      const result = await mockProvider.textToSpeech(text, testLanguage);
      
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it('should generate different audio for different text', async () => {
      const text1 = 'First message';
      const text2 = 'Second message';
      
      const audio1 = await mockProvider.textToSpeech(text1, testLanguage);
      const audio2 = await mockProvider.textToSpeech(text2, testLanguage);
      
      // Should generate different audio data
      expect(audio1.byteLength).not.toBe(audio2.byteLength);
    });

    it('should generate consistent audio for same text', async () => {
      const text = 'Consistent message';
      
      const audio1 = await mockProvider.textToSpeech(text, testLanguage);
      const audio2 = await mockProvider.textToSpeech(text, testLanguage);
      
      // Should generate same audio data for same input
      expect(audio1.byteLength).toBe(audio2.byteLength);
      
      const view1 = new Uint8Array(audio1);
      const view2 = new Uint8Array(audio2);
      
      for (let i = 0; i < view1.length; i++) {
        expect(view1[i]).toBe(view2[i]);
      }
    });

    it('should throw error for empty text', async () => {
      await expect(mockProvider.textToSpeech('', testLanguage))
        .rejects.toThrow('Text is empty');
    });

    it('should throw error for whitespace-only text', async () => {
      await expect(mockProvider.textToSpeech('   ', testLanguage))
        .rejects.toThrow('Text is empty');
    });

    it('should throw error for unsupported language', async () => {
      const unsupportedLanguage: Language = {
        code: 'xx',
        name: 'Unsupported',
        nativeName: 'Unsupported',
        isSupported: false,
        voiceSupported: false
      };

      await expect(mockProvider.textToSpeech('test', unsupportedLanguage))
        .rejects.toThrow('Language xx not supported for voice processing');
    });

    it('should scale audio size with text length', async () => {
      const shortText = 'Hi';
      const longText = 'This is a much longer text message that should generate more audio data';
      
      const shortAudio = await mockProvider.textToSpeech(shortText, testLanguage);
      const longAudio = await mockProvider.textToSpeech(longText, testLanguage);
      
      expect(longAudio.byteLength).toBeGreaterThan(shortAudio.byteLength);
    });
  });

  describe('detectLanguage', () => {
    it('should return a supported language', async () => {
      const result = await mockProvider.detectLanguage(mockAudioData);
      
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('voiceSupported');
      expect(result.voiceSupported).toBe(true);
      
      const isSupported = SUPPORTED_LANGUAGES.some(
        lang => lang.code === result.code && lang.voiceSupported
      );
      expect(isSupported).toBe(true);
    });

    it('should return consistent results for same audio', async () => {
      const result1 = await mockProvider.detectLanguage(mockAudioData);
      const result2 = await mockProvider.detectLanguage(mockAudioData);
      
      expect(result1.code).toBe(result2.code);
    });

    it('should return different results for different audio', async () => {
      const audio1 = new ArrayBuffer(1000);
      const audio2 = new ArrayBuffer(2000);
      
      // Fill with different patterns
      new Uint8Array(audio1).fill(100);
      new Uint8Array(audio2).fill(200);
      
      const result1 = await mockProvider.detectLanguage(audio1);
      const result2 = await mockProvider.detectLanguage(audio2);
      
      // Results might be different (not guaranteed, but likely with different data)
      // At minimum, both should be valid supported languages
      expect(SUPPORTED_LANGUAGES.some(lang => lang.code === result1.code)).toBe(true);
      expect(SUPPORTED_LANGUAGES.some(lang => lang.code === result2.code)).toBe(true);
    });

    it('should throw error for empty audio data', async () => {
      const emptyAudio = new ArrayBuffer(0);
      
      await expect(mockProvider.detectLanguage(emptyAudio))
        .rejects.toThrow('Audio data is empty');
    });
  });

  describe('validateAudioQuality', () => {
    it('should return quality score for valid audio', async () => {
      const result = await mockProvider.validateAudioQuality(mockAudioData);
      
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('recommendation');
      
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.issues)).toBe(true);
      expect(typeof result.recommendation).toBe('string');
    });

    it('should penalize very small audio files', async () => {
      const smallAudio = new ArrayBuffer(1000); // 1KB
      const result = await mockProvider.validateAudioQuality(smallAudio);
      
      expect(result.score).toBeLessThan(85); // Should be penalized
      expect(result.issues.some(issue => issue.includes('small'))).toBe(true);
    });

    it('should penalize very large audio files', async () => {
      const largeAudio = new ArrayBuffer(2 * 1024 * 1024); // 2MB
      const result = await mockProvider.validateAudioQuality(largeAudio);
      
      expect(result.score).toBeLessThan(85); // Should be penalized
      expect(result.issues.some(issue => issue.includes('large'))).toBe(true);
    });

    it('should provide appropriate recommendations', async () => {
      const goodAudio = new ArrayBuffer(50000); // 50KB - good size
      const result = await mockProvider.validateAudioQuality(goodAudio);
      
      expect(result.recommendation).toBeTruthy();
      expect(result.recommendation.length).toBeGreaterThan(0);
      
      if (result.score >= 90) {
        expect(result.recommendation).toContain('Excellent');
      } else if (result.score >= 75) {
        expect(result.recommendation).toContain('Good');
      }
    });

    it('should throw error for empty audio data', async () => {
      const emptyAudio = new ArrayBuffer(0);
      
      await expect(mockProvider.validateAudioQuality(emptyAudio))
        .rejects.toThrow('Audio data is empty');
    });

    it('should return consistent scores for same audio', async () => {
      const result1 = await mockProvider.validateAudioQuality(mockAudioData);
      const result2 = await mockProvider.validateAudioQuality(mockAudioData);
      
      expect(result1.score).toBe(result2.score);
      expect(result1.issues).toEqual(result2.issues);
      expect(result1.recommendation).toBe(result2.recommendation);
    });
  });

  describe('isVoiceSupported', () => {
    it('should return true for supported languages', () => {
      const supportedLanguages = SUPPORTED_LANGUAGES.filter(lang => lang.voiceSupported);
      
      supportedLanguages.forEach(language => {
        expect(mockProvider.isVoiceSupported(language)).toBe(true);
      });
    });

    it('should return false for unsupported languages', () => {
      const unsupportedLanguage: Language = {
        code: 'xx',
        name: 'Unsupported',
        nativeName: 'Unsupported',
        isSupported: false,
        voiceSupported: false
      };
      
      expect(mockProvider.isVoiceSupported(unsupportedLanguage)).toBe(false);
    });
  });

  describe('getSupportedVoiceLanguages', () => {
    it('should return all voice-supported languages', async () => {
      const result = await mockProvider.getSupportedVoiceLanguages();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      result.forEach(language => {
        expect(language.voiceSupported).toBe(true);
      });
    });

    it('should match expected supported languages', async () => {
      const result = await mockProvider.getSupportedVoiceLanguages();
      const expectedLanguages = SUPPORTED_LANGUAGES.filter(lang => lang.voiceSupported);
      
      expect(result.length).toBe(expectedLanguages.length);
      
      expectedLanguages.forEach(expectedLang => {
        expect(result.some(lang => lang.code === expectedLang.code)).toBe(true);
      });
    });
  });

  describe('performance and reliability', () => {
    it('should handle multiple concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        mockProvider.speechToText(mockAudioData, testLanguage)
      );
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('should maintain consistent behavior across multiple calls', async () => {
      const text = 'Test message';
      const calls = 5;
      
      const results = await Promise.all(
        Array.from({ length: calls }, () => 
          mockProvider.textToSpeech(text, testLanguage)
        )
      );
      
      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i].byteLength).toBe(results[0].byteLength);
      }
    });
  });
});