import { TranslationProvider } from './translation-service';
import { Language, TranslationResult } from '../../types';
import { getLanguageByCode } from '../../constants/languages';
import { logger } from '../../utils/logger';

/**
 * Mock Translation Provider for Development and Testing
 * Simulates translation behavior without external API calls
 */
export class MockTranslationProvider extends TranslationProvider {
  private readonly mockTranslations: Map<string, string> = new Map([
    // Common greetings - ALL LANGUAGES
    // Hindi
    ['hi-en-नमस्ते', 'Hello'],
    ['hi-mr-नमस्ते', 'नमस्कार'],
    ['hi-ta-नमस्ते', 'வணக்கம்'],
    ['hi-te-नमस्ते', 'నమస్కారం'],
    ['hi-gu-नमस्ते', 'નમસ્તે'],
    ['hi-bn-नमस्ते', 'নমস্কার'],
    ['hi-kn-नमस्ते', 'ನಮಸ್ಕಾರ'],
    ['hi-pa-नमस्ते', 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ'],
    
    // English to all languages
    ['en-hi-Hello', 'नमस्ते'],
    ['en-mr-Hello', 'नमस्कार'],
    ['en-ta-Hello', 'வணக்கம்'],
    ['en-te-Hello', 'నమస్కారం'],
    ['en-gu-Hello', 'નમસ્તે'],
    ['en-bn-Hello', 'নমস্কার'],
    ['en-kn-Hello', 'ನಮಸ್ಕಾರ'],
    ['en-pa-Hello', 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ'],
    
    // Marathi to all languages
    ['mr-en-नमस्कार', 'Hello'],
    ['mr-hi-नमस्कार', 'नमस्ते'],
    ['mr-ta-नमस्कार', 'வணக்கம்'],
    ['mr-te-नमस्कार', 'నమస్కారం'],
    ['mr-gu-नमस्कार', 'નમસ્તે'],
    ['mr-bn-नमस्कार', 'নমস্কার'],
    ['mr-kn-नमस्कार', 'ನಮಸ್ಕಾರ'],
    ['mr-pa-नमस्कार', 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ'],
    
    // Tamil to all languages
    ['ta-en-வணக்கம்', 'Hello'],
    ['ta-hi-வணக்கம்', 'नमस्ते'],
    ['ta-mr-வணக்கம்', 'नमस्कार'],
    ['ta-te-வணக்கம்', 'నమస్కారం'],
    ['ta-gu-வணக்கம்', 'નમસ્તે'],
    ['ta-bn-வணக்கம்', 'নমস্কার'],
    ['ta-kn-வணக்கம்', 'ನಮಸ್ಕಾರ'],
    ['ta-pa-வணக்கம்', 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ'],
    
    // Bengali to all languages
    ['bn-en-নমস্কার', 'Hello'],
    ['bn-hi-নমস্কার', 'नमस्ते'],
    ['bn-mr-নমস্কার', 'नमस्कार'],
    ['bn-ta-নমস্কার', 'வணக்கம்'],
    ['bn-te-নমস্কার', 'నమస్కారం'],
    ['bn-gu-নমস্কার', 'નમસ્તે'],
    ['bn-kn-নমস্কার', 'ನಮಸ್ಕಾರ'],
    ['bn-pa-নমস্কার', 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ'],
    
    // Telugu to all languages
    ['te-en-నమస్కారం', 'Hello'],
    ['te-hi-నమస్కారం', 'नमस्ते'],
    ['te-mr-నమస్కారం', 'नमस्कार'],
    ['te-ta-నమస్కారం', 'வணக்கம்'],
    ['te-bn-నమస్కారం', 'নমস্কার'],
    ['te-gu-నమస్కారం', 'નમસ્તે'],
    ['te-kn-నమస్కారం', 'ನಮಸ್ಕಾರ'],
    ['te-pa-నమస్కారం', 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ'],
    
    // Gujarati to all languages
    ['gu-en-નમસ્તે', 'Hello'],
    ['gu-hi-નમસ્તે', 'नमस्ते'],
    ['gu-mr-નમસ્તે', 'नमस्कार'],
    ['gu-ta-નમસ્તે', 'வணக்கம்'],
    ['gu-te-નમસ્તે', 'నమస్కారం'],
    ['gu-bn-નમસ્તે', 'নমস্কার'],
    ['gu-kn-નમસ્તે', 'ನಮಸ್ಕಾರ'],
    ['gu-pa-નમસ્તે', 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ'],
    
    // Kannada to all languages
    ['kn-en-ನಮಸ್ಕಾರ', 'Hello'],
    ['kn-hi-ನಮಸ್ಕಾರ', 'नमस्ते'],
    ['kn-mr-ನಮಸ್ಕಾರ', 'नमस्कार'],
    ['kn-ta-ನಮಸ್ಕಾರ', 'வணக்கம்'],
    ['kn-te-ನಮಸ್ಕಾರ', 'నమస్కారం'],
    ['kn-gu-ನಮಸ್ಕಾರ', 'નમસ્તે'],
    ['kn-bn-ನಮಸ್ಕಾರ', 'নমস্কার'],
    ['kn-pa-ನಮಸ್ಕಾರ', 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ'],
    
    // Punjabi to all languages
    ['pa-en-ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'Hello'],
    ['pa-hi-ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'नमस्ते'],
    ['pa-mr-ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'नमस्कार'],
    ['pa-ta-ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'வணக்கம்'],
    ['pa-te-ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'నమస్కారం'],
    ['pa-gu-ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'નમસ્તે'],
    ['pa-bn-ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'নমস্কার'],
    ['pa-kn-ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'ನಮಸ್ಕಾರ'],
    
    // TOMATO translations - ALL LANGUAGES
    // English to all
    ['en-hi-Tomato', 'टमाटर'],
    ['en-mr-Tomato', 'टोमॅटो'],
    ['en-ta-Tomato', 'தக்காளி'],
    ['en-te-Tomato', 'టమాటా'],
    ['en-gu-Tomato', 'ટમેટાં'],
    ['en-bn-Tomato', 'টমেটো'],
    ['en-kn-Tomato', 'ಟೊಮೇಟೊ'],
    ['en-pa-Tomato', 'ਟਮਾਟਰ'],
    
    // All languages to English
    ['hi-en-टमाटर', 'Tomato'],
    ['mr-en-टोमॅटो', 'Tomato'],
    ['ta-en-தக்காளி', 'Tomato'],
    ['te-en-టమాటా', 'Tomato'],
    ['gu-en-ટમેટાં', 'Tomato'],
    ['bn-en-টমেটো', 'Tomato'],
    ['kn-en-ಟೊಮೇಟೊ', 'Tomato'],
    ['pa-en-ਟਮਾਟਰ', 'Tomato'],
    
    // Cross-language TOMATO translations (non-English pairs)
    // Hindi to all others
    ['hi-mr-टमाटर', 'टोमॅटो'],
    ['hi-ta-टमाटर', 'தக்காளி'],
    ['hi-te-टमाटर', 'టమాటా'],
    ['hi-gu-टमाटर', 'ટમેટાં'],
    ['hi-bn-टमाटर', 'টমেটো'],
    ['hi-kn-टमाटर', 'ಟೊಮೇಟೊ'],
    ['hi-pa-टमाटर', 'ਟਮਾਟਰ'],
    
    // Marathi to all others
    ['mr-hi-टोमॅटो', 'टमाटर'],
    ['mr-ta-टोमॅटो', 'தக்காளி'],
    ['mr-te-टोमॅटो', 'టమాటా'],
    ['mr-gu-टोमॅटो', 'ટમેટાં'],
    ['mr-bn-टोमॅटो', 'টমেটো'],
    ['mr-kn-टोमॅटो', 'ಟೊಮೇಟೊ'],
    ['mr-pa-टोमॅटो', 'ਟਮਾਟਰ'],
    
    // Tamil to all others
    ['ta-hi-தக்காளி', 'टमाटर'],
    ['ta-mr-தக்காளி', 'टोमॅटो'],
    ['ta-te-தக்காளி', 'టమాటా'],
    ['ta-gu-தக்காளி', 'ટમેટાં'],
    ['ta-bn-தக்காளி', 'টমেটো'],
    ['ta-kn-தக்காளி', 'ಟೊಮೇಟೊ'],
    ['ta-pa-தக்காளி', 'ਟਮਾਟਰ'],
    
    // Telugu to all others
    ['te-hi-టమాటా', 'टमाटर'],
    ['te-mr-టమాటా', 'टोमॅटो'],
    ['te-ta-టమాటా', 'தக்காளி'],
    ['te-gu-టమాటా', 'ટમેટાં'],
    ['te-bn-టమాటా', 'টমেটো'],
    ['te-kn-టమాటా', 'ಟೊಮೇಟೊ'],
    ['te-pa-టమాటా', 'ਟਮਾਟਰ'],
    
    // Gujarati to all others
    ['gu-hi-ટમેટાં', 'टमाटर'],
    ['gu-mr-ટમેટાં', 'टोमॅटो'],
    ['gu-ta-ટમેટાં', 'தக்காளி'],
    ['gu-te-ટમેટાં', 'టమాటా'],
    ['gu-bn-ટમેટાં', 'টমেটো'],
    ['gu-kn-ટમેટાં', 'ಟೊಮೇಟೊ'],
    ['gu-pa-ટમેટાં', 'ਟਮਾਟਰ'],
    
    // Bengali to all others
    ['bn-hi-টমেটো', 'टमाटर'],
    ['bn-mr-টমেটো', 'टोमॅटो'],
    ['bn-ta-টমেটো', 'தக்காளி'],
    ['bn-te-টমেটো', 'టమాటా'],
    ['bn-gu-টমেটো', 'ટમેટાં'],
    ['bn-kn-টমেটো', 'ಟೊಮೇಟೊ'],
    ['bn-pa-টমেটো', 'ਟਮਾਟਰ'],
    
    // Kannada to all others
    ['kn-hi-ಟೊಮೇಟೊ', 'टमाटर'],
    ['kn-mr-ಟೊಮೇಟೊ', 'टोमॅटो'],
    ['kn-ta-ಟೊಮೇಟೊ', 'தக்காளி'],
    ['kn-te-ಟೊಮೇಟೊ', 'టమాటా'],
    ['kn-gu-ಟೊಮೇಟೊ', 'ટમેટાં'],
    ['kn-bn-ಟೊಮೇಟೊ', 'টমেটো'],
    ['kn-pa-ಟೊಮೇಟೊ', 'ਟਮਾਟਰ'],
    
    // Punjabi to all others
    ['pa-hi-ਟਮਾਟਰ', 'टमाटर'],
    ['pa-mr-ਟਮਾਟਰ', 'टोमॅटो'],
    ['pa-ta-ਟਮਾਟਰ', 'தக்காளி'],
    ['pa-te-ਟਮਾਟਰ', 'టమాటా'],
    ['pa-gu-ਟਮਾਟਰ', 'ટમેટાં'],
    ['pa-bn-ਟਮਾਟਰ', 'টমেটো'],
    ['pa-kn-ਟਮਾਟਰ', 'ಟೊಮೇಟೊ'],
    
    // PRICE QUESTIONS - ALL LANGUAGES
    // "How much?" in all languages
    ['en-hi-How much?', 'कितना?'],
    ['en-mr-How much?', 'किती?'],
    ['en-ta-How much?', 'எவ்வளவு?'],
    ['en-te-How much?', 'ఎంత?'],
    ['en-gu-How much?', 'કેટલું?'],
    ['en-bn-How much?', 'কত?'],
    ['en-kn-How much?', 'ಎಷ್ಟು?'],
    ['en-pa-How much?', 'ਕਿੰਨਾ?'],
    
    // All languages to English
    ['hi-en-कितना?', 'How much?'],
    ['mr-en-किती?', 'How much?'],
    ['ta-en-எவ்வளவு?', 'How much?'],
    ['te-en-ఎంత?', 'How much?'],
    ['gu-en-કેટલું?', 'How much?'],
    ['bn-en-কত?', 'How much?'],
    ['kn-en-ಎಷ್ಟು?', 'How much?'],
    ['pa-en-ਕਿੰਨਾ?', 'How much?'],
    
    // Cross-language "How much?" translations (non-English pairs)
    // Hindi to all others
    ['hi-mr-कितना?', 'किती?'],
    ['hi-ta-कितना?', 'எவ்வளவு?'],
    ['hi-te-कितना?', 'ఎంత?'],
    ['hi-gu-कितना?', 'કેટલું?'],
    ['hi-bn-कितना?', 'কত?'],
    ['hi-kn-कितना?', 'ಎಷ್ಟು?'],
    ['hi-pa-कितना?', 'ਕਿੰਨਾ?'],
    
    // Marathi to all others
    ['mr-hi-किती?', 'कितना?'],
    ['mr-ta-किती?', 'எவ்வளவு?'],
    ['mr-te-किती?', 'ఎంత?'],
    ['mr-gu-किती?', 'કેટલું?'],
    ['mr-bn-किती?', 'কত?'],
    ['mr-kn-किती?', 'ಎಷ್ಟು?'],
    ['mr-pa-किती?', 'ਕਿੰਨਾ?'],
    
    // Tamil to all others
    ['ta-hi-எவ்வளவு?', 'कितना?'],
    ['ta-mr-எவ்வளவு?', 'किती?'],
    ['ta-te-எவ்வளவு?', 'ఎంత?'],
    ['ta-gu-எவ்வளவு?', 'કેટલું?'],
    ['ta-bn-எவ்வளவு?', 'কত?'],
    ['ta-kn-எவ்வளவு?', 'ಎಷ್ಟು?'],
    ['ta-pa-எவ்வளவு?', 'ਕਿੰਨਾ?'],
    
    // Telugu to all others
    ['te-hi-ఎంత?', 'कितना?'],
    ['te-mr-ఎంత?', 'किती?'],
    ['te-ta-ఎంత?', 'எவ்வளவு?'],
    ['te-gu-ఎంత?', 'કેટલું?'],
    ['te-bn-ఎంత?', 'কত?'],
    ['te-kn-ఎంత?', 'ಎಷ್ಟು?'],
    ['te-pa-ఎంత?', 'ਕਿੰਨਾ?'],
    
    // Gujarati to all others
    ['gu-hi-કેટલું?', 'कितना?'],
    ['gu-mr-કેટલું?', 'किती?'],
    ['gu-ta-કેટલું?', 'எவ்வளவு?'],
    ['gu-te-કેટલું?', 'ఎంత?'],
    ['gu-bn-કેટલું?', 'কত?'],
    ['gu-kn-કેટલું?', 'ಎಷ್ಟು?'],
    ['gu-pa-કેટલું?', 'ਕਿੰਨਾ?'],
    
    // Bengali to all others
    ['bn-hi-কত?', 'कितना?'],
    ['bn-mr-কত?', 'किती?'],
    ['bn-ta-কত?', 'எவ்வளவு?'],
    ['bn-te-কত?', 'ఎంత?'],
    ['bn-gu-কত?', 'કેટલું?'],
    ['bn-kn-কত?', 'ಎಷ್ಟು?'],
    ['bn-pa-কত?', 'ਕਿੰਨਾ?'],
    
    // Kannada to all others
    ['kn-hi-ಎಷ್ಟು?', 'कितना?'],
    ['kn-mr-ಎಷ್ಟು?', 'किती?'],
    ['kn-ta-ಎಷ್ಟು?', 'எவ்வளவு?'],
    ['kn-te-ಎಷ್ಟು?', 'ఎంత?'],
    ['kn-gu-ಎಷ್ಟು?', 'કેટલું?'],
    ['kn-bn-ಎಷ್ಟು?', 'কত?'],
    ['kn-pa-ಎಷ್ಟು?', 'ਕਿੰਨਾ?'],
    
    // Punjabi to all others
    ['pa-hi-ਕਿੰਨਾ?', 'कितना?'],
    ['pa-mr-ਕਿੰਨਾ?', 'किती?'],
    ['pa-ta-ਕਿੰਨਾ?', 'எவ்வளவு?'],
    ['pa-te-ਕਿੰਨਾ?', 'ఎంత?'],
    ['pa-gu-ਕਿੰਨਾ?', 'કેટલું?'],
    ['pa-bn-ਕਿੰਨਾ?', 'কত?'],
    ['pa-kn-ਕਿੰਨਾ?', 'ಎಷ್ಟು?'],
    ['bn-en-কত?', 'How much?'],
    ['kn-en-ಎಷ್ಟು?', 'How much?'],
    ['pa-en-ਕਿੰਨਾ?', 'How much?'],
    
    // COMPLETE PHRASES - "Hello, how much for tomatoes?"
    // English to all languages
    ['en-hi-Hello, how much for tomatoes?', 'नमस्ते, टमाटर कितने में?'],
    ['en-mr-Hello, how much for tomatoes?', 'नमस्कार, टोमॅटो किती ला?'],
    ['en-ta-Hello, how much for tomatoes?', 'வணக்கம், தக்காளி எவ्वளவு?'],
    ['en-te-Hello, how much for tomatoes?', 'నమస్కారం, టమాటా ఎంత?'],
    ['en-gu-Hello, how much for tomatoes?', 'નમસ્તે, ટમેટાં કેટલું?'],
    ['en-bn-Hello, how much for tomatoes?', 'নমস্কার, টমেটো কত দাম?'],
    ['en-kn-Hello, how much for tomatoes?', 'ನಮಸ್ಕಾರ, ಟೊಮೇಟೊ ಎಷ್ಟು?'],
    ['en-pa-Hello, how much for tomatoes?', 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਟਮਾਟਰ ਕਿੰਨੇ ਦੇ?'],
    
    // All languages to English
    ['hi-en-नमस्ते, टमाटर कितने में?', 'Hello, how much for tomatoes?'],
    ['mr-en-नमस्कार, टोमॅटो किती ला?', 'Hello, how much for tomatoes?'],
    ['ta-en-வணக்கம், தக்காளி எவ्वளவு?', 'Hello, how much for tomatoes?'],
    ['te-en-నమస్కారం, టమాటా ఎంత?', 'Hello, how much for tomatoes?'],
    ['gu-en-નમસ્તે, ટમેટાં કેટલું?', 'Hello, how much for tomatoes?'],
    ['bn-en-নমস্কার, টমেটো কত দাম?', 'Hello, how much for tomatoes?'],
    ['kn-en-ನಮಸ್ಕಾರ, ಟೊಮೇಟೊ ಎಷ್ಟು?', 'Hello, how much for tomatoes?'],
    ['pa-en-ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਟਮਾਟਰ ਕਿੰਨੇ ਦੇ?', 'Hello, how much for tomatoes?'],
    
    // THANK YOU - ALL LANGUAGES
    ['en-hi-Thank you', 'धन्यवाद'],
    ['en-mr-Thank you', 'धन्यवाद'],
    ['en-ta-Thank you', 'நன்றி'],
    ['en-te-Thank you', 'ధన్యవాదాలు'],
    ['en-gu-Thank you', 'આભાર'],
    ['en-bn-Thank you', 'ধন্যবাদ'],
    ['en-kn-Thank you', 'ಧನ್ಯವಾದಗಳು'],
    ['en-pa-Thank you', 'ਧੰਨਵਾਦ'],
    
    // All to English
    ['hi-en-धन्यवाद', 'Thank you'],
    ['mr-en-धन्यवाद', 'Thank you'],
    ['ta-en-நன்றி', 'Thank you'],
    ['te-en-ధన్యవాదాలు', 'Thank you'],
    ['gu-en-આભાર', 'Thank you'],
    ['bn-en-ধন্যবাদ', 'Thank you'],
    ['kn-en-ಧನ್ಯವಾದಗಳು', 'Thank you'],
    ['pa-en-ਧੰਨਵਾਦ', 'Thank you'],
    
    // Cross-language "Thank you" translations (non-English pairs)
    // Hindi to all others
    ['hi-mr-धन्यवाद', 'धन्यवाद'],
    ['hi-ta-धन्यवाद', 'நன்றி'],
    ['hi-te-धन्यवाद', 'ధన్యవాదాలు'],
    ['hi-gu-धन्यवाद', 'આભાર'],
    ['hi-bn-धन्यवाद', 'ধন্যবাদ'],
    ['hi-kn-धन्यवाद', 'ಧನ್ಯವಾದಗಳು'],
    ['hi-pa-धन्यवाद', 'ਧੰਨਵਾਦ'],
    
    // Marathi to all others
    ['mr-hi-धन्यवाद', 'धन्यवाद'],
    ['mr-ta-धन्यवाद', 'நன்றி'],
    ['mr-te-धन्यवाद', 'ధన్యవాదాలు'],
    ['mr-gu-धन्यवाद', 'આભાર'],
    ['mr-bn-धन्यवाद', 'ধন্যবাদ'],
    ['mr-kn-धन्यवाद', 'ಧನ್ಯವಾದಗಳು'],
    ['mr-pa-धन्यवाद', 'ਧੰਨਵਾਦ'],
    
    // Tamil to all others
    ['ta-hi-நன்றி', 'धन्यवाद'],
    ['ta-mr-நன்றி', 'धन्यवाद'],
    ['ta-te-நன்றி', 'ధన్యవాదాలు'],
    ['ta-gu-நன்றி', 'આભાર'],
    ['ta-bn-நன்றி', 'ধন্যবাদ'],
    ['ta-kn-நன்றி', 'ಧನ್ಯವಾದಗಳು'],
    ['ta-pa-நன்றி', 'ਧੰਨਵਾਦ'],
    
    // Telugu to all others
    ['te-hi-ధన్యవాదాలు', 'धन्यवाद'],
    ['te-mr-ధన్యవాదాలు', 'धन्यवाद'],
    ['te-ta-ధన్యవాదాలు', 'நன்றி'],
    ['te-gu-ధన్యవాదాలు', 'આભાર'],
    ['te-bn-ధన్యవాదాలు', 'ধন্যবাদ'],
    ['te-kn-ధన్యవాదాలు', 'ಧನ್ಯವಾದಗಳು'],
    ['te-pa-ధన్యవాదాలు', 'ਧੰਨਵਾਦ'],
    
    // Gujarati to all others
    ['gu-hi-આભાર', 'धन्यवाद'],
    ['gu-mr-આભાર', 'धन्यवाद'],
    ['gu-ta-આભાર', 'நன்றி'],
    ['gu-te-આભાર', 'ధన్యవాదాలు'],
    ['gu-bn-આભાર', 'ধন্যবাদ'],
    ['gu-kn-આભાર', 'ಧನ್ಯವಾದಗಳು'],
    ['gu-pa-આભાર', 'ਧੰਨਵਾਦ'],
    
    // Bengali to all others
    ['bn-hi-ধন্যবাদ', 'धन्यवाद'],
    ['bn-mr-ধন্যবাদ', 'धन्यवाद'],
    ['bn-ta-ধন্যবাদ', 'நன்றி'],
    ['bn-te-ধন্যবাদ', 'ధన్యవాదాలు'],
    ['bn-gu-ধন্যবাদ', 'આભાર'],
    ['bn-kn-ধন্যবাদ', 'ಧನ್ಯವಾದಗಳು'],
    ['bn-pa-ধন্যবাদ', 'ਧੰਨਵਾਦ'],
    
    // Kannada to all others
    ['kn-hi-ಧನ್ಯವಾದಗಳು', 'धन्यवाद'],
    ['kn-mr-ಧನ್ಯವಾದಗಳು', 'धन्यवाद'],
    ['kn-ta-ಧನ್ಯವಾದಗಳು', 'நன்றி'],
    ['kn-te-ಧನ್ಯವಾದಗಳು', 'ధన్యవాదాలు'],
    ['kn-gu-ಧನ್ಯವಾದಗಳು', 'આભાર'],
    ['kn-bn-ಧನ್ಯವಾದಗಳು', 'ধন্যবাদ'],
    ['kn-pa-ಧನ್ಯವಾದಗಳು', 'ਧੰਨਵਾਦ'],
    
    // Punjabi to all others
    ['pa-hi-ਧੰਨਵਾਦ', 'धन्यवाद'],
    ['pa-mr-ਧੰਨਵਾਦ', 'धन्यवाद'],
    ['pa-ta-ਧੰਨਵਾਦ', 'நன்றி'],
    ['pa-te-ਧੰਨਵਾਦ', 'ధన్యవాదాలు'],
    ['pa-gu-ਧੰਨਵਾਦ', 'આભાર'],
    ['pa-bn-ਧੰਨਵਾਦ', 'ধন্যবাদ'],
    ['pa-kn-ਧੰਨਵਾਦ', 'ಧನ್ಯವಾದಗಳು'],
    
    // ONION - ALL LANGUAGES
    ['en-hi-Onion', 'प्याज'],
    ['en-mr-Onion', 'कांदा'],
    ['en-ta-Onion', 'வெங்காயம்'],
    ['en-te-Onion', 'ఉల్లిపాయ'],
    ['en-gu-Onion', 'ડુંગળી'],
    ['en-bn-Onion', 'পেঁয়াজ'],
    ['en-kn-Onion', 'ಈರುಳ್ಳಿ'],
    ['en-pa-Onion', 'ਪਿਆਜ਼'],
    
    // All to English
    ['hi-en-प्याज', 'Onion'],
    ['mr-en-कांदा', 'Onion'],
    ['ta-en-வெங்காயம்', 'Onion'],
    ['te-en-ఉల్లిపాయ', 'Onion'],
    ['gu-en-ડુંગળી', 'Onion'],
    ['bn-en-পেঁয়াজ', 'Onion'],
    ['kn-en-ಈರುಳ್ಳಿ', 'Onion'],
    ['pa-en-ਪਿਆਜ਼', 'Onion'],
    
    // Cross-language ONION translations (non-English pairs)
    // Hindi to all others
    ['hi-mr-प्याज', 'कांदा'],
    ['hi-ta-प्याज', 'வெங்காயம்'],
    ['hi-te-प्याज', 'ఉల్లిపాయ'],
    ['hi-gu-प्याज', 'ડુંગળી'],
    ['hi-bn-प्याज', 'পেঁয়াজ'],
    ['hi-kn-प्याज', 'ಈರುಳ್ಳಿ'],
    ['hi-pa-प्याज', 'ਪਿਆਜ਼'],
    
    // Marathi to all others
    ['mr-hi-कांदा', 'प्याज'],
    ['mr-ta-कांदा', 'வெங்காயம்'],
    ['mr-te-कांदा', 'ఉల్లిపాయ'],
    ['mr-gu-कांदा', 'ડુંગળી'],
    ['mr-bn-कांदा', 'পেঁয়াজ'],
    ['mr-kn-कांदा', 'ಈರುಳ್ಳಿ'],
    ['mr-pa-कांदा', 'ਪਿਆਜ਼'],
    
    // Tamil to all others
    ['ta-hi-வெங்காயம்', 'प्याज'],
    ['ta-mr-வெங்காயம்', 'कांदा'],
    ['ta-te-வெங்காயம்', 'ఉల్లిపాయ'],
    ['ta-gu-வெங்காயம்', 'ડુંગળી'],
    ['ta-bn-வெங்காயம்', 'পেঁয়াজ'],
    ['ta-kn-வெங்காயம்', 'ಈರುಳ್ಳಿ'],
    ['ta-pa-வெங்காயம்', 'ਪਿਆਜ਼'],
    
    // Telugu to all others
    ['te-hi-ఉల్లిపాయ', 'प्याज'],
    ['te-mr-ఉల్లిపాయ', 'कांदा'],
    ['te-ta-ఉల్లిపాయ', 'வெங்காயம்'],
    ['te-gu-ఉల్లిపాయ', 'ડુંગળી'],
    ['te-bn-ఉల్లిపాయ', 'পেঁয়াজ'],
    ['te-kn-ఉల్లిపాయ', 'ಈರುಳ್ಳಿ'],
    ['te-pa-ఉల్లిపాయ', 'ਪਿਆਜ਼'],
    
    // Gujarati to all others
    ['gu-hi-ડુંગળી', 'प्याज'],
    ['gu-mr-ડુંગળી', 'कांदा'],
    ['gu-ta-ડુંગળી', 'வெங்காயம்'],
    ['gu-te-ડુંગળી', 'ఉల్లిపాయ'],
    ['gu-bn-ડુંગળી', 'পেঁয়াজ'],
    ['gu-kn-ડુંગળી', 'ಈರುಳ್ಳಿ'],
    ['gu-pa-ડુંગળી', 'ਪਿਆਜ਼'],
    
    // Bengali to all others
    ['bn-hi-পেঁয়াজ', 'प्याज'],
    ['bn-mr-পেঁয়াজ', 'कांदा'],
    ['bn-ta-পেঁয়াজ', 'வெங்காயம்'],
    ['bn-te-পেঁয়াজ', 'ఉల్లిపాయ'],
    ['bn-gu-পেঁয়াজ', 'ડુંગળી'],
    ['bn-kn-পেঁয়াজ', 'ಈರುಳ್ಳಿ'],
    ['bn-pa-পেঁয়াজ', 'ਪਿਆਜ਼'],
    
    // Kannada to all others
    ['kn-hi-ಈರುಳ್ಳಿ', 'प्याज'],
    ['kn-mr-ಈರುಳ್ಳಿ', 'कांदा'],
    ['kn-ta-ಈರುಳ್ಳಿ', 'வெங்காயம்'],
    ['kn-te-ಈರುಳ್ಳಿ', 'ఉల్లిపాయ'],
    ['kn-gu-ಈರುಳ್ಳಿ', 'ડુંગળી'],
    ['kn-bn-ಈರುಳ್ಳಿ', 'পেঁয়াজ'],
    ['kn-pa-ಈರುಳ್ಳಿ', 'ਪਿਆਜ਼'],
    
    // Punjabi to all others
    ['pa-hi-ਪਿਆਜ਼', 'प्याज'],
    ['pa-mr-ਪਿਆਜ਼', 'कांदा'],
    ['pa-ta-ਪਿਆਜ਼', 'வெங்காயம்'],
    ['pa-te-ਪਿਆਜ਼', 'ఉల్లిపాయ'],
    ['pa-gu-ਪਿਆਜ਼', 'ડુંગળી'],
    ['pa-bn-ਪਿਆਜ਼', 'পেঁয়াজ'],
    ['pa-kn-ਪਿਆਜ਼', 'ಈರುಳ್ಳಿ'],
    
    // COMMON MARKET PHRASES
    ['en-hi-Too expensive', 'बहुत महंगा'],
    ['en-mr-Too expensive', 'खूप महाग'],
    ['en-ta-Too expensive', 'மிக விலை அதிகம்'],
    ['en-bn-Too expensive', 'খুব দামি'],
    
    ['hi-en-बहुत महंगा', 'Too expensive'],
    ['mr-en-खूप महाग', 'Too expensive'],
    ['ta-en-மிக விலை அதிகம்', 'Too expensive'],
    ['bn-en-খুব দামি', 'Too expensive'],
    
    // Numbers and prices (universal)
    ['hi-en-100', '100'],
    ['en-hi-100', '100'],
    ['hi-en-₹25', '₹25'],
    ['en-hi-₹25', '₹25'],
  ]);

  private readonly languagePatterns: Map<string, RegExp> = new Map([
    ['hi', /[\u0900-\u097F]/], // Devanagari script
    ['mr', /[\u0900-\u097F]/], // Devanagari script (same as Hindi)
    ['ta', /[\u0B80-\u0BFF]/], // Tamil script
    ['te', /[\u0C00-\u0C7F]/], // Telugu script
    ['gu', /[\u0A80-\u0AFF]/], // Gujarati script
    ['bn', /[\u0980-\u09FF]/], // Bengali script
    ['kn', /[\u0C80-\u0CFF]/], // Kannada script
    ['pa', /[\u0A00-\u0A7F]/], // Gurmukhi script
    ['en', /^[a-zA-Z0-9\s.,!?'"()-]+$/], // English characters
  ]);

  async translate(text: string, from: Language, to: Language): Promise<TranslationResult> {
    // Simulate API delay
    await this.simulateDelay(200, 800);

    const key = `${from.code}-${to.code}-${text.trim()}`;
    
    // Check for exact match in mock translations
    if (this.mockTranslations.has(key)) {
      const translatedText = this.mockTranslations.get(key)!;
      logger.debug(`Mock translation: ${text} -> ${translatedText}`);
      
      return {
        translatedText,
        confidence: 0.95,
        detectedSourceLanguage: from,
      };
    }

    // For numbers and currency, return as-is
    if (/^[\d₹$.,\s]+$/.test(text)) {
      return {
        translatedText: text,
        confidence: 1.0,
        detectedSourceLanguage: from,
      };
    }

    // Generate mock translation for unknown text
    const mockTranslation = this.generateMockTranslation(text, from, to);
    
    return {
      translatedText: mockTranslation,
      confidence: 0.75, // Lower confidence for generated translations
      detectedSourceLanguage: from,
    };
  }

  async detectLanguage(text: string): Promise<string> {
    // Simulate API delay
    await this.simulateDelay(100, 300);

    // Check text against language patterns
    for (const [langCode, pattern] of this.languagePatterns.entries()) {
      if (pattern.test(text)) {
        logger.debug(`Detected language: ${langCode} for text: ${text}`);
        return langCode;
      }
    }

    // Default to English if no pattern matches
    logger.debug(`Defaulting to English for text: ${text}`);
    return 'en';
  }

  /**
   * Generate a mock translation for unknown text
   */
  private generateMockTranslation(text: string, from: Language, to: Language): string {
    // Try to find partial matches or similar phrases
    const lowerText = text.toLowerCase().trim();
    
    // Common greeting patterns
    if (lowerText.includes('hello') || lowerText.includes('hi ')) {
      if (to.code === 'hi') return 'नमस्ते';
      if (to.code === 'mr') return 'नमस्कार';
      if (to.code === 'ta') return 'வணக்கம்';
      if (to.code === 'bn') return 'নমস্কার';
      if (to.code === 'en') return 'Hello';
    }
    
    // Price/cost related patterns
    if (lowerText.includes('much') || lowerText.includes('price') || lowerText.includes('cost')) {
      if (to.code === 'hi') return 'कितना पैसा?';
      if (to.code === 'mr') return 'किती पैसे?';
      if (to.code === 'ta') return 'எவ்வளவு?';
      if (to.code === 'bn') return 'কত দাম?';
      if (to.code === 'en') return 'How much?';
    }
    
    // Tomato related patterns
    if (lowerText.includes('tomato') || text.includes('टमाटर') || text.includes('टोमॅटो') || text.includes('தக்காளி')) {
      if (to.code === 'hi') return 'टमाटर';
      if (to.code === 'mr') return 'टोमॅटो';
      if (to.code === 'ta') return 'தக்காளி';
      if (to.code === 'bn') return 'টমেটো';
      if (to.code === 'en') return 'Tomato';
    }
    
    // If we can't provide a good translation, return a helpful message
    return `[Translation: ${from.name} → ${to.name}] ${text}`;
  }

  /**
   * Simulate network delay for realistic testing
   */
  private async simulateDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Add custom translation to mock data (useful for testing)
   */
  addMockTranslation(from: string, to: string, original: string, translated: string): void {
    const key = `${from}-${to}-${original}`;
    this.mockTranslations.set(key, translated);
    logger.debug(`Added mock translation: ${key} -> ${translated}`);
  }

  /**
   * Get all mock translations (useful for debugging)
   */
  getMockTranslations(): Map<string, string> {
    return new Map(this.mockTranslations);
  }

  /**
   * Clear all mock translations
   */
  clearMockTranslations(): void {
    this.mockTranslations.clear();
    logger.debug('Cleared all mock translations');
  }
}