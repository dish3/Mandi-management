import { VoiceInterface } from '../../interfaces/voice';
import { VoiceService } from './voice-service';
import { MockVoiceProvider } from './mock-voice-provider';
import { GoogleVoiceProvider } from './google-voice-provider';
import { AWSVoiceProvider } from './aws-voice-provider';

/**
 * Voice service provider types
 */
export type VoiceProviderType = 'mock' | 'google' | 'aws' | 'azure' | 'default';

/**
 * Voice Service Factory
 * Creates and manages voice service instances
 */
export class VoiceFactory {
  private static instances: Map<VoiceProviderType, VoiceInterface> = new Map();

  /**
   * Create or get voice service instance
   */
  static createVoiceService(provider: VoiceProviderType = 'default'): VoiceInterface {
    // Return cached instance if exists
    if (this.instances.has(provider)) {
      return this.instances.get(provider)!;
    }

    let service: VoiceInterface;

    switch (provider) {
      case 'mock':
        service = new MockVoiceProvider();
        break;
      
      case 'google':
        service = new GoogleVoiceProvider();
        break;
      
      case 'aws':
        service = new AWSVoiceProvider();
        break;
      
      case 'azure':
        // In real implementation, would create Azure Speech service
        throw new Error('Azure Speech service not implemented yet');
      
      case 'default':
      default:
        service = new VoiceService();
        break;
    }

    // Cache the instance
    this.instances.set(provider, service);
    return service;
  }

  /**
   * Clear cached instances (useful for testing)
   */
  static clearCache(): void {
    this.instances.clear();
  }

  /**
   * Get available providers
   */
  static getAvailableProviders(): VoiceProviderType[] {
    return ['mock', 'google', 'aws', 'default'];
  }

  /**
   * Check if provider is available
   */
  static isProviderAvailable(provider: VoiceProviderType): boolean {
    return this.getAvailableProviders().includes(provider);
  }
}