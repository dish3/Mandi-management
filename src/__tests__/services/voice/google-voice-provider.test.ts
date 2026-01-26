import { GoogleVoiceProvider } from '../../../services/voice/google-voice-provider';
import { Language } from '../../../types';
import { SUPPORTED_LANGUAGES } from '../../../constants/languages';

// Mock fetch globally
global.fetch = jest.fn();

describe('GoogleVoiceProvider', () => {
  let provider: GoogleVoiceProvider;
  let mockAudioData: ArrayBuffer;
  let testLanguage: Language;

  beforeEach(() => {
    provider = new GoogleVoiceProvider('test-api-key', 'test-project');
    
    // Create mock audio data
    mockAudioData = new ArrayBuffer(50000); // 50KB for good quality
    const view = new Uint8Array(mockAudioData);
    for (let i = 0; i < view.length; i++) {
      view[i] = Math.floor(Math.random() * 256);
    }

    // Use Hindi as test language
    testLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === 'hi')!;

    // Reset fetch mock
    (fetch as jest.Mock).mockReset();
  });

  describe('constructor', () => {
    it('should initialize with provided credentials', () => {
      const providerWithCreds = new GoogleVoiceProvider('api-key', 'project-id');
      expect(providerWithCreds).toBeInstanceOf(GoogleVoiceProvider);
    });

    it('should initialize without credentials', () => {
      const providerNoCreds = new GoogleVoiceProvider();
      expect(providerNoCreds).toBeInstanceOf(GoogleVoiceProvider);
    });
  });

  describe('speechToText', () => {
    it('should convert speech to text successfully', async () => {
      const mockResponse = {
        results: [
          {
            alternatives: [
              { transcript: 'Hello world' }
            ]
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await provider.speechToText(mockAudioData, testLanguage);
      
      expect(typeof result).toBe('string');
      expect(result).toBe('Hello world');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error when API key is not configured', async () => {
      const providerNoKey = new GoogleVoiceProvider();
      
      await expect(providerNoKey.speechToText(mockAudioData, testLanguage))
        .rejects.toThrow('Google Speech API key not configured');
    });

    it('should throw error for API failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: { message: 'Bad request' } })
      });

      await expect(provider.speechToText(mockAudioData, testLanguage))
        .rejects.toThrow('Google Speech API error: 400 - Bad request');
    });

    it('should throw error for empty results', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] })
      });

      await expect(provider.speechToText(mockAudioData, testLanguage))
        .rejects.toThrow('No speech recognized in audio');
    });

    it('should throw error for poor quality audio', async () => {
      const poorAudio = new ArrayBuffer(100); // Very small audio
      
      await expect(provider.speechToText(poorAudio, testLanguage))
        .rejects.toThrow('Audio quality too low for Google Speech API');
    });

    it('should throw error for unsupported language', async () => {
      const unsupportedLanguage: Language = {
        code: 'xx',
        name: 'Unsupported',
        nativeName: 'Unsupported',
        isSupported: false,
        voiceSupported: false
      };

      await expect(provider.speechToText(mockAudioData, unsupportedLanguage))
        .rejects.toThrow('Voice processing not supported for language: xx');
    });
  });

  describe('textToSpeech', () => {
    it('should convert text to speech successfully', async () => {
      const mockResponse = {
        audioContent: 'base64audiodata'
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const text = 'Hello world';
      const result = await provider.textToSpeech(text, testLanguage);
      
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(0);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error when API key is not configured', async () => {
      const providerNoKey = new GoogleVoiceProvider();
      
      await expect(providerNoKey.textToSpeech('test', testLanguage))
        .rejects.toThrow('Google Speech API key not configured');
    });

    it('should throw error for API failure', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ error: { message: 'Forbidden' } })
      });

      await expect(provider.textToSpeech('test', testLanguage))
        .rejects.toThrow('Google TTS API error: 403 - Forbidden');
    });

    it('should throw error for empty audio content', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await expect(provider.textToSpeech('test', testLanguage))
        .rejects.toThrow('No audio content received from Google TTS API');
    });

    it('should throw error for empty text', async () => {
      await expect(provider.textToSpeech('', testLanguage))
        .rejects.toThrow('Text is empty or invalid');
    });

    it('should throw error for text too long', async () => {
      const longText = 'a'.repeat(5001);
      
      await expect(provider.textToSpeech(longText, testLanguage))
        .rejects.toThrow('Text too long for Google TTS API (max 5000 characters)');
    });
  });

  describe('detectLanguage', () => {
    it('should detect language successfully', async () => {
      const mockResponse = {
        results: [
          {
            languageCode: 'hi-IN',
            alternatives: [{ transcript: 'test' }]
          }
        ]
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await provider.detectLanguage(mockAudioData);
      
      expect(result).toHaveProperty('code');
      expect(result.code).toBe('hi');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should return fallback language when no results', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] })
      });

      const result = await provider.detectLanguage(mockAudioData);
      
      expect(result).toHaveProperty('code');
      expect(result.voiceSupported).toBe(true);
    });

    it('should throw error when API key is not configured', async () => {
      const providerNoKey = new GoogleVoiceProvider();
      
      await expect(providerNoKey.detectLanguage(mockAudioData))
        .rejects.toThrow('Google Speech API key not configured');
    });
  });

  describe('validateAudioQuality', () => {
    it('should validate audio quality successfully', async () => {
      const result = await provider.validateAudioQuality(mockAudioData);
      
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('recommendation');
      expect(typeof result.score).toBe('number');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should penalize very large files', async () => {
      const largeAudio = new ArrayBuffer(15 * 1024 * 1024); // 15MB
      const result = await provider.validateAudioQuality(largeAudio);
      
      expect(result.score).toBeLessThan(100);
      expect(result.issues.some(issue => issue.includes('too large'))).toBe(true);
    });

    it('should penalize very small files', async () => {
      const smallAudio = new ArrayBuffer(500);
      const result = await provider.validateAudioQuality(smallAudio);
      
      expect(result.score).toBeLessThan(100);
      expect(result.issues.some(issue => issue.includes('too small'))).toBe(true);
    });
  });

  describe('isVoiceSupported', () => {
    it('should return true for supported languages', () => {
      const supportedLanguages = SUPPORTED_LANGUAGES.filter(lang => 
        lang.voiceSupported && ['hi', 'mr', 'ta', 'te', 'gu', 'bn', 'kn', 'pa', 'en'].includes(lang.code)
      );
      
      supportedLanguages.forEach(language => {
        expect(provider.isVoiceSupported(language)).toBe(true);
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
      
      expect(provider.isVoiceSupported(unsupportedLanguage)).toBe(false);
    });
  });

  describe('getSupportedVoiceLanguages', () => {
    it('should return supported voice languages', async () => {
      const result = await provider.getSupportedVoiceLanguages();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      result.forEach(language => {
        expect(language.voiceSupported).toBe(true);
      });
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(provider.speechToText(mockAudioData, testLanguage))
        .rejects.toThrow('Google Speech-to-text conversion failed');
    });

    it('should handle malformed API responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(provider.speechToText(mockAudioData, testLanguage))
        .rejects.toThrow('Google Speech-to-text conversion failed');
    });
  });
});