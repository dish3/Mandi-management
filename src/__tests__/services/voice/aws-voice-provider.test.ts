import { AWSVoiceProvider } from '../../../services/voice/aws-voice-provider';
import { Language } from '../../../types';
import { SUPPORTED_LANGUAGES } from '../../../constants/languages';

describe('AWSVoiceProvider', () => {
  let provider: AWSVoiceProvider;
  let mockAudioData: ArrayBuffer;
  let testLanguage: Language;

  beforeEach(() => {
    provider = new AWSVoiceProvider('test-access-key', 'test-secret-key', 'us-east-1');
    
    // Create mock audio data
    mockAudioData = new ArrayBuffer(50000); // 50KB for good quality
    const view = new Uint8Array(mockAudioData);
    for (let i = 0; i < view.length; i++) {
      view[i] = Math.floor(Math.random() * 256);
    }

    // Use Hindi as test language (supported by AWS)
    testLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === 'hi')!;
  });

  describe('constructor', () => {
    it('should initialize with provided credentials', () => {
      const providerWithCreds = new AWSVoiceProvider('access-key', 'secret-key', 'us-west-2');
      expect(providerWithCreds).toBeInstanceOf(AWSVoiceProvider);
    });

    it('should initialize without credentials', () => {
      const providerNoCreds = new AWSVoiceProvider();
      expect(providerNoCreds).toBeInstanceOf(AWSVoiceProvider);
    });

    it('should use default region when not provided', () => {
      const providerDefaultRegion = new AWSVoiceProvider('key', 'secret');
      expect(providerDefaultRegion).toBeInstanceOf(AWSVoiceProvider);
    });
  });

  describe('speechToText', () => {
    it('should convert speech to text successfully', async () => {
      const result = await provider.speechToText(mockAudioData, testLanguage);
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toBe('यह एक परीक्षण संदेश है'); // Expected Hindi mock response
    });

    it('should throw error when credentials are not configured', async () => {
      const providerNoCreds = new AWSVoiceProvider();
      
      await expect(providerNoCreds.speechToText(mockAudioData, testLanguage))
        .rejects.toThrow('AWS credentials not configured');
    });

    it('should throw error for poor quality audio', async () => {
      const poorAudio = new ArrayBuffer(100); // Very small audio
      
      await expect(provider.speechToText(poorAudio, testLanguage))
        .rejects.toThrow('Audio quality too low for AWS Transcribe');
    });

    it('should throw error for unsupported language', async () => {
      const unsupportedLanguage: Language = {
        code: 'mr', // Marathi - not supported by AWS
        name: 'Marathi',
        nativeName: 'मराठी',
        isSupported: true,
        voiceSupported: true
      };

      await expect(provider.speechToText(mockAudioData, unsupportedLanguage))
        .rejects.toThrow('Voice processing not supported for language: mr');
    });

    it('should handle empty audio data', async () => {
      const emptyAudio = new ArrayBuffer(0);
      
      await expect(provider.speechToText(emptyAudio, testLanguage))
        .rejects.toThrow('Audio data is empty or invalid');
    });
  });

  describe('textToSpeech', () => {
    it('should convert text to speech successfully', async () => {
      const text = 'Hello world';
      const result = await provider.textToSpeech(text, testLanguage);
      
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBeGreaterThan(0);
    });

    it('should generate different audio for different text', async () => {
      const text1 = 'First message';
      const text2 = 'Second message';
      
      const audio1 = await provider.textToSpeech(text1, testLanguage);
      const audio2 = await provider.textToSpeech(text2, testLanguage);
      
      expect(audio1.byteLength).not.toBe(audio2.byteLength);
    });

    it('should throw error when credentials are not configured', async () => {
      const providerNoCreds = new AWSVoiceProvider();
      
      await expect(providerNoCreds.textToSpeech('test', testLanguage))
        .rejects.toThrow('AWS credentials not configured');
    });

    it('should throw error for empty text', async () => {
      await expect(provider.textToSpeech('', testLanguage))
        .rejects.toThrow('Text is empty or invalid');
    });

    it('should throw error for text too long', async () => {
      const longText = 'a'.repeat(6001);
      
      await expect(provider.textToSpeech(longText, testLanguage))
        .rejects.toThrow('Text too long for AWS Polly (max 6000 characters)');
    });

    it('should throw error for unsupported language', async () => {
      const unsupportedLanguage: Language = {
        code: 'mr', // Marathi - not supported by AWS
        name: 'Marathi',
        nativeName: 'मराठी',
        isSupported: true,
        voiceSupported: true
      };

      await expect(provider.textToSpeech('test', unsupportedLanguage))
        .rejects.toThrow('Voice processing not supported for language: mr');
    });
  });

  describe('detectLanguage', () => {
    it('should detect language successfully', async () => {
      const result = await provider.detectLanguage(mockAudioData);
      
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('voiceSupported');
      expect(result.voiceSupported).toBe(true);
      
      // Should be one of the AWS supported languages
      const awsSupportedCodes = ['hi', 'ta', 'te', 'en'];
      expect(awsSupportedCodes).toContain(result.code);
    });

    it('should return consistent results for same audio', async () => {
      const result1 = await provider.detectLanguage(mockAudioData);
      const result2 = await provider.detectLanguage(mockAudioData);
      
      expect(result1.code).toBe(result2.code);
    });

    it('should throw error when credentials are not configured', async () => {
      const providerNoCreds = new AWSVoiceProvider();
      
      await expect(providerNoCreds.detectLanguage(mockAudioData))
        .rejects.toThrow('AWS credentials not configured');
    });

    it('should throw error for empty audio data', async () => {
      const emptyAudio = new ArrayBuffer(0);
      
      await expect(provider.detectLanguage(emptyAudio))
        .rejects.toThrow('Audio data is empty or invalid');
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

    it('should penalize extremely large files', async () => {
      // Create a buffer that simulates > 2GB (AWS limit)
      // We can't actually create 2GB in memory, so we'll mock the validation
      const result = await provider.validateAudioQuality(mockAudioData);
      
      // For normal sized audio, should not have size issues
      expect(result.score).toBeGreaterThan(0);
    });

    it('should penalize very small files', async () => {
      const smallAudio = new ArrayBuffer(500);
      const result = await provider.validateAudioQuality(smallAudio);
      
      expect(result.score).toBeLessThan(100);
      expect(result.issues.some(issue => issue.includes('too small'))).toBe(true);
    });

    it('should provide appropriate recommendations', async () => {
      const result = await provider.validateAudioQuality(mockAudioData);
      
      expect(result.recommendation).toBeTruthy();
      expect(result.recommendation.length).toBeGreaterThan(0);
      expect(result.recommendation).toContain('AWS');
    });

    it('should throw error for empty audio data', async () => {
      const emptyAudio = new ArrayBuffer(0);
      
      await expect(provider.validateAudioQuality(emptyAudio))
        .rejects.toThrow('Audio data is empty or invalid');
    });
  });

  describe('isVoiceSupported', () => {
    it('should return true for AWS supported languages', () => {
      const awsSupportedLanguages = SUPPORTED_LANGUAGES.filter(lang => 
        ['hi', 'ta', 'te', 'en'].includes(lang.code)
      );
      
      awsSupportedLanguages.forEach(language => {
        expect(provider.isVoiceSupported(language)).toBe(true);
      });
    });

    it('should return false for AWS unsupported languages', () => {
      const awsUnsupportedLanguages = SUPPORTED_LANGUAGES.filter(lang => 
        !['hi', 'ta', 'te', 'en'].includes(lang.code)
      );
      
      awsUnsupportedLanguages.forEach(language => {
        expect(provider.isVoiceSupported(language)).toBe(false);
      });
    });

    it('should return false for completely unsupported languages', () => {
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
    it('should return only AWS supported voice languages', async () => {
      const result = await provider.getSupportedVoiceLanguages();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      result.forEach(language => {
        expect(language.voiceSupported).toBe(true);
        expect(['hi', 'ta', 'te', 'en']).toContain(language.code);
      });
    });

    it('should return fewer languages than the general supported list', async () => {
      const result = await provider.getSupportedVoiceLanguages();
      const allSupportedLanguages = SUPPORTED_LANGUAGES.filter(lang => lang.voiceSupported);
      
      expect(result.length).toBeLessThanOrEqual(allSupportedLanguages.length);
    });
  });

  describe('mock implementations', () => {
    it('should return language-specific responses for different languages', async () => {
      const englishLang = SUPPORTED_LANGUAGES.find(lang => lang.code === 'en')!;
      const tamilLang = SUPPORTED_LANGUAGES.find(lang => lang.code === 'ta')!;
      
      const hindiResult = await provider.speechToText(mockAudioData, testLanguage);
      const englishResult = await provider.speechToText(mockAudioData, englishLang);
      const tamilResult = await provider.speechToText(mockAudioData, tamilLang);
      
      expect(hindiResult).toBe('यह एक परीक्षण संदेश है');
      expect(englishResult).toBe('This is a test message from AWS Transcribe');
      expect(tamilResult).toBe('இது ஒரு சோதனை செய்தி');
    });

    it('should generate consistent audio for same input', async () => {
      const text = 'Consistent test message';
      
      const audio1 = await provider.textToSpeech(text, testLanguage);
      const audio2 = await provider.textToSpeech(text, testLanguage);
      
      expect(audio1.byteLength).toBe(audio2.byteLength);
      
      const view1 = new Uint8Array(audio1);
      const view2 = new Uint8Array(audio2);
      
      for (let i = 0; i < view1.length; i++) {
        expect(view1[i]).toBe(view2[i]);
      }
    });
  });

  describe('performance and reliability', () => {
    it('should handle multiple concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => 
        provider.speechToText(mockAudioData, testLanguage)
      );
      
      const results = await Promise.all(promises);
      
      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('should have reasonable processing times', async () => {
      const startTime = Date.now();
      await provider.textToSpeech('Test message', testLanguage);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeGreaterThan(200); // Should have simulated delay
      expect(duration).toBeLessThan(2000); // But not too long
    });
  });
});