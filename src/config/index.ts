import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/multilingual_mandi',
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // API Keys
  apiKeys: {
    openai: process.env.OPENAI_API_KEY || '',
    googleTranslate: process.env.GOOGLE_TRANSLATE_API_KEY || '',
    mandiApi: process.env.MANDI_API_KEY || '',
  },

  // AWS Configuration
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
  },

  // External APIs
  externalApis: {
    mandiBaseUrl: process.env.MANDI_API_BASE_URL || 'https://api.data.gov.in/resource/',
  },

  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || 'default-jwt-secret',
    encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key',
  },

  // Cache Configuration
  cache: {
    defaultTtl: parseInt(process.env.CACHE_TTL || '3600', 10),
    translationTtl: parseInt(process.env.TRANSLATION_CACHE_TTL || '86400', 10),
    priceTtl: parseInt(process.env.PRICE_CACHE_TTL || '1800', 10),
  },

  // System Limits
  limits: {
    maxConcurrentSessions: 1000,
    translationTimeout: 5000,
    voiceProcessingTimeout: 10000,
    dataRetentionDays: 30,
  },
};