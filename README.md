# Multilingual Mandi Platform

AI-Powered Price Discovery & Negotiation Platform for Local Vendors

## Overview

The Multilingual Mandi platform enables seamless multilingual communication and AI-powered price discovery for local vendors, farmers, and small traders. It bridges language barriers and provides real-time market information to ensure fair trade practices.

## Features

- **Multilingual Communication**: Real-time translation between 8+ Indian languages
- **AI Price Discovery**: Current market prices with government API integration
- **Negotiation Assistant**: AI-driven negotiation guidance and strategy
- **Voice Interface**: Speech-to-text and text-to-speech for accessibility
- **Vendor Dashboard**: Product management and analytics
- **Mobile Optimized**: Works on low-end smartphones with 2G/3G connectivity

## Supported Languages

- Hindi (हिन्दी)
- Marathi (मराठी)
- Tamil (தமிழ்)
- Telugu (తెలుగు)
- Gujarati (ગુજરાતી)
- Bengali (বাংলা)
- Kannada (ಕನ್ನಡ)
- Punjabi (ਪੰਜਾਬੀ)
- English

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 13+
- Redis 6+
- TypeScript

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd multilingual-mandi
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env
# Edit .env with your configuration
\`\`\`

4. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

### Testing

Run the test suite:
\`\`\`bash
npm test
\`\`\`

Run tests in watch mode:
\`\`\`bash
npm run test:watch
\`\`\`

## Architecture

The platform follows a microservices architecture with:

- **API Gateway**: Request routing and load balancing
- **Communication Service**: Real-time messaging and translation
- **Price Discovery Service**: Market data fetching and AI estimation
- **Negotiation Assistant**: AI-powered negotiation guidance
- **Voice Processing Service**: Speech-to-text and text-to-speech
- **User Management Service**: Authentication and user profiles

## API Documentation

API documentation will be available at `/docs` when the server is running.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions, please open an issue in the repository.