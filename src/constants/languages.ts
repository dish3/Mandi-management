import { Language } from '../types';

/**
 * Supported Indian languages for the platform
 */
export const SUPPORTED_LANGUAGES: Language[] = [
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    isSupported: true,
    voiceSupported: true,
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    isSupported: true,
    voiceSupported: true,
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    isSupported: true,
    voiceSupported: true,
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    isSupported: true,
    voiceSupported: true,
  },
  {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    isSupported: true,
    voiceSupported: true,
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    isSupported: true,
    voiceSupported: true,
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    isSupported: true,
    voiceSupported: true,
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    isSupported: true,
    voiceSupported: true,
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    isSupported: true,
    voiceSupported: true,
  },
];

/**
 * Get language by code
 */
export function getLanguageByCode(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
}

/**
 * Check if language is supported
 */
export function isLanguageSupported(code: string): boolean {
  return SUPPORTED_LANGUAGES.some(lang => lang.code === code && lang.isSupported);
}

/**
 * Check if voice is supported for language
 */
export function isVoiceSupported(code: string): boolean {
  const language = getLanguageByCode(code);
  return language ? language.voiceSupported : false;
}