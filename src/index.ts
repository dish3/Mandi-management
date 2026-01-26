/**
 * Multilingual Mandi Platform
 * Entry point for the application
 */

import express from 'express';
import { config } from './config';
import { logger } from './utils/logger';
import { TranslationServiceFactory } from './services/translation/translation-factory';
import { VoiceFactory } from './services/voice/voice-factory';
import { PriceDiscoveryFactory } from './services/price-discovery/price-discovery-factory';

async function main() {
  try {
    logger.info('Starting Multilingual Mandi Platform...');
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`Port: ${config.port}`);

    // Create Express app
    const app = express();
    
    // Middleware
    app.use(express.json());
    app.use(express.static('public'));

    // Initialize services
    logger.info('Initializing services...');
    const translationService = TranslationServiceFactory.createAuto();
    const voiceService = VoiceFactory.createVoiceService('default');
    const priceDiscoveryService = await PriceDiscoveryFactory.create();
    logger.info('Services initialized successfully');

    // Basic routes
    app.get('/', (req, res) => {
      res.json({
        message: 'Welcome to Multilingual Mandi Platform',
        version: '1.0.0',
        services: {
          translation: 'active',
          voice: 'active',
          priceDiscovery: 'active'
        },
        endpoints: {
          health: '/health',
          translate: '/api/translate',
          voice: '/api/voice',
          prices: '/api/prices'
        }
      });
    });

    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          translation: 'up',
          voice: 'up',
          priceDiscovery: 'up'
        }
      });
    });

    // API Routes
    app.post('/api/translate', async (req, res) => {
      try {
        const { text, from, to } = req.body;
        if (!text || !from || !to) {
          return res.status(400).json({ error: 'Missing required fields: text, from, to' });
        }
        
        // Import the language utilities
        const { getLanguageByCode } = await import('./constants/languages');
        
        // Convert string codes to Language objects
        const fromLang = getLanguageByCode(from);
        const toLang = getLanguageByCode(to);
        
        if (!fromLang) {
          return res.status(400).json({ error: `Unsupported source language: ${from}` });
        }
        
        if (!toLang) {
          return res.status(400).json({ error: `Unsupported target language: ${to}` });
        }
        
        const result = await translationService.translate(text, fromLang, toLang);
        res.json({ 
          translation: result.translatedText, 
          original: text, 
          from: fromLang.name, 
          to: toLang.name,
          confidence: result.confidence
        });
      } catch (error) {
        logger.error('Translation error:', error);
        res.status(500).json({ error: 'Translation failed' });
      }
    });

    app.post('/api/voice/synthesize', async (req, res) => {
      try {
        const { text, language } = req.body;
        if (!text || !language) {
          return res.status(400).json({ error: 'Missing required fields: text, language' });
        }
        
        const audioBuffer = await voiceService.textToSpeech(text, language);
        res.json({ 
          message: 'Speech synthesized successfully',
          audioSize: audioBuffer.byteLength,
          language 
        });
      } catch (error) {
        logger.error('Voice synthesis error:', error);
        res.status(500).json({ error: 'Voice synthesis failed' });
      }
    });

    app.get('/api/prices/:product', async (req, res) => {
      try {
        const { product } = req.params;
        const { location = 'delhi', quantity = 1, unit = 'kg' } = req.query;
        
        const productQuery = {
          name: product,
          category: 'vegetables', // Default category
          location: location as string,
          quantity: Number(quantity),
          unit: unit as string
        };

        const priceInfo = await priceDiscoveryService.getCurrentPrice(productQuery);
        res.json(priceInfo);
      } catch (error) {
        logger.error('Price discovery error:', error);
        res.status(500).json({ error: 'Price discovery failed' });
      }
    });

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Multilingual Mandi Platform started successfully`);
      logger.info(`Server running on http://localhost:${config.port}`);
      logger.info('Available endpoints:');
      logger.info('  GET  / - Welcome page');
      logger.info('  GET  /health - Health check');
      logger.info('  POST /api/translate - Translation service');
      logger.info('  POST /api/voice/synthesize - Voice synthesis');
      logger.info('  GET  /api/prices/:product - Price discovery');
    });

    // Graceful shutdown
    const shutdown = () => {
      logger.info('Shutting down server...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

if (require.main === module) {
  main();
}