// Export voice service components
export { VoiceService } from './voice-service';
export { MockVoiceProvider } from './mock-voice-provider';
export { GoogleVoiceProvider } from './google-voice-provider';
export { AWSVoiceProvider } from './aws-voice-provider';
export { VoiceFactory, type VoiceProviderType } from './voice-factory';

// Re-export interface for convenience
export type { VoiceInterface } from '../../interfaces/voice';