import { Message, TranslatedMessage, NegotiationSession, Language, SessionId } from '../types';

/**
 * Communication Engine Interface
 * Manages real-time messaging, conversation history, and message routing
 */
export interface CommunicationEngine {
  /**
   * Send a message in a negotiation session
   */
  sendMessage(sessionId: string, message: Message): Promise<void>;

  /**
   * Translate a message to target language
   */
  translateMessage(message: Message, targetLanguage: Language): Promise<TranslatedMessage>;

  /**
   * Create a new negotiation session between vendor and buyer
   */
  createNegotiationSession(vendorId: string, buyerId: string): Promise<SessionId>;

  /**
   * Get conversation history for a session
   */
  getConversationHistory(sessionId: string): Promise<Message[]>;

  /**
   * Get active sessions for a user
   */
  getActiveSessions(userId: string): Promise<NegotiationSession[]>;

  /**
   * Close a negotiation session
   */
  closeSession(sessionId: string, finalPrice?: number): Promise<void>;
}