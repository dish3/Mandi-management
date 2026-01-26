import { VoiceService } from '../../../services/voice/voice-service';
import { Language } from '../../../types';
import { SUPPORTED_LANGUAGES } from '../../../constants/languages';

describe('VoiceService', () => {
  let voiceService: VoiceService;
  let mockAudioData: ArrayBuffer;
  let testLanguage: Language;

  beforeEach(() => {
    voiceService = new VoiceService();
    
    // Create mock audio data with better quality (larger size)
    mockAudioData = new ArrayBuffer(50000); // 50KB for better quality
    const view = new Uint8Array(mockAudioData);
    for (let i = 0; i < view.length; i++) {
      view[i] = Math.floor(Math.random() * 256);
    }

    // Use Hindi as test language
    testLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === 'hi')!;
  });

  describe('speechToText', () => {
    it('should convert speech to text successfully', async () => {
      const result = await voiceService.speechToText(mockAudioData, testLanguage);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should throw error for empty audio data', async () => {
      const emptyAudio = new ArrayBuffer(0);
      
      await expect(voiceService.speechToText(emptyAudio, testLanguage))
        .rejects.toThrow('Audio data is empty or invalid');
    });

    it('should throw error for unsupported language', async () => {
      const unsupportedLanguage: Language = {
        code: 'xx',
        name: 'Unsupported',
        nativeName: 'Unsupported',
        isSupported: false,
        voiceSupported: false
      };

      await expect(voiceService.speechToText(mockAudioData, unsupportedLanguage))
        .rejects.toThrow('Voice processing not supported for language: xx');
    });

    it('should throw error for audio file too large', async () => {
      const largeAudio = new ArrayBuffer(15 * 1024 * 1024); // 15MB
      
      await expect(voiceService.speechToText(largeAudio, testLanguage))
        .rejects.toThrow('Audio file too large (max 10MB)');
    });

    it('should throw error for poor quality audio', async () => {
      // Create very small audio that will fail quality check
      const poorAudio = new ArrayBuffer(100);
      
      await expect(voiceService.speechToText(poorAudio, testLanguage))
        .rejects.toThrow('Audio quality too low');
    });
  });

  describe('textToSpeech', () => {
    it('should convert text to speech successfully', async () => {
      const text = 'Hello, this is a test message';
      const result = await voiceService.textToSpeech(text, testLanguage);
      
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it('should throw error for empty text', async () => {
      await expect(voiceService.textToSpeech('', testLanguage))
        .rejects.toThrow('Text is empty or invalid');
    });

    it('should throw error for whitespace-only text', async () => {
      await expect(voiceService.textToSpeech('   ', testLanguage))
        .rejects.toThrow('Text is empty or invalid');
    });

    it('should throw error for text too long', async () => {
      const longText = 'a'.repeat(5001);
      
      await expect(voiceService.textToSpeech(longText, testLanguage))
        .rejects.toThrow('Text too long (max 5000 characters)');
    });

    it('should throw error for unsupported language', async () => {
      const unsupportedLanguage: Language = {
        code: 'xx',
        name: 'Unsupported',
        nativeName: 'Unsupported',
        isSupported: false,
        voiceSupported: false
      };

      await expect(voiceService.textToSpeech('test', unsupportedLanguage))
        .rejects.toThrow('Voice processing not supported for language: xx');
    });

    it('should generate different audio for different text', async () => {
      const text1 = 'First message';
      const text2 = 'Second message';
      
      const audio1 = await voiceService.textToSpeech(text1, testLanguage);
      const audio2 = await voiceService.textToSpeech(text2, testLanguage);
      
      // Audio should be different (different sizes at minimum)
      expect(audio1.byteLength).not.toBe(audio2.byteLength);
    });
  });

  describe('detectLanguage', () => {
    it('should detect language from audio', async () => {
      const result = await voiceService.detectLanguage(mockAudioData);
      
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('voiceSupported');
      expect(result.voiceSupported).toBe(true);
    });

    it('should throw error for empty audio data', async () => {
      const emptyAudio = new ArrayBuffer(0);
      
      await expect(voiceService.detectLanguage(emptyAudio))
        .rejects.toThrow('Audio data is empty or invalid');
    });

    it('should return consistent results for same audio', async () => {
      const result1 = await voiceService.detectLanguage(mockAudioData);
      const result2 = await voiceService.detectLanguage(mockAudioData);
      
      expect(result1.code).toBe(result2.code);
    });
  });

  describe('validateAudioQuality', () => {
    it('should validate audio quality successfully', async () => {
      const result = await voiceService.validateAudioQuality(mockAudioData);
      
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('recommendation');
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.issues)).toBe(true);
      expect(typeof result.recommendation).toBe('string');
    });

    it('should detect issues with very small audio', async () => {
      const smallAudio = new ArrayBuffer(500);
      const result = await voiceService.validateAudioQuality(smallAudio);
      
      expect(result.score).toBeLessThan(100);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some(issue => issue.includes('small'))).toBe(true);
    });

    it('should throw error for empty audio data', async () => {
      const emptyAudio = new ArrayBuffer(0);
      
      await expect(voiceService.validateAudioQuality(emptyAudio))
        .rejects.toThrow('Audio data is empty or invalid');
    });

    it('should provide appropriate recommendations', async () => {
      const result = await voiceService.validateAudioQuality(mockAudioData);
      
      expect(result.recommendation).toBeTruthy();
      expect(result.recommendation.length).toBeGreaterThan(0);
    });
  });

  describe('isVoiceSupported', () => {
    it('should return true for supported languages', () => {
      const supportedLanguages = SUPPORTED_LANGUAGES.filter(lang => lang.voiceSupported);
      
      supportedLanguages.forEach(language => {
        expect(voiceService.isVoiceSupported(language)).toBe(true);
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
      
      expect(voiceService.isVoiceSupported(unsupportedLanguage)).toBe(false);
    });
  });

  describe('getSupportedVoiceLanguages', () => {
    it('should return all voice-supported languages', async () => {
      const result = await voiceService.getSupportedVoiceLanguages();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      result.forEach(language => {
        expect(language.voiceSupported).toBe(true);
      });
    });

    it('should match languages from constants', async () => {
      const result = await voiceService.getSupportedVoiceLanguages();
      const expectedLanguages = SUPPORTED_LANGUAGES.filter(lang => lang.voiceSupported);
      
      expect(result.length).toBe(expectedLanguages.length);
      
      expectedLanguages.forEach(expectedLang => {
        expect(result.some(lang => lang.code === expectedLang.code)).toBe(true);
      });
    });
  });

  describe('error handling', () => {
    it('should handle null audio data gracefully', async () => {
      await expect(voiceService.speechToText(null as any, testLanguage))
        .rejects.toThrow('Audio data is empty or invalid');
    });

    it('should handle undefined text gracefully', async () => {
      await expect(voiceService.textToSpeech(undefined as any, testLanguage))
        .rejects.toThrow('Text is empty or invalid');
    });

    it('should handle invalid language objects', async () => {
      const invalidLanguage = {} as Language;
      
      await expect(voiceService.speechToText(mockAudioData, invalidLanguage))
        .rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle minimum valid audio size', async () => {
      const minAudio = new ArrayBuffer(1000);
      const view = new Uint8Array(minAudio);
      view.fill(128); // Fill with mid-range values
      
      const quality = await voiceService.validateAudioQuality(minAudio);
      expect(quality.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle maximum valid text length', async () => {
      const maxText = 'a'.repeat(5000);
      
      const result = await voiceService.textToSpeech(maxText, testLanguage);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it('should handle all supported languages', async () => {
      const supportedLanguages = SUPPORTED_LANGUAGES.filter(lang => lang.voiceSupported);
      
      for (const language of supportedLanguages) {
        const result = await voiceService.textToSpeech('test', language);
        expect(result.byteLength).toBeGreaterThan(0);
      }
    });
  });
});