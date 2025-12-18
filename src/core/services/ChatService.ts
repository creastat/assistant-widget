import { ChatStore } from '../store';
import { generateId } from '../utils';
import { VoiceService } from './VoiceService';
import type {
  ChatConfig,
  WebSocketMessage,
  Message,
  ChatEventHandler,
  ChatEvent,
} from '../types';
import { WSMessageType } from '../types';

export class ChatService {
  private ws: WebSocket | null = null;
  private config: ChatConfig;
  private sessionId: string;
  private eventHandler?: ChatEventHandler;
  private reconnectAttempts = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private currentMessageId: string | null = null;
  private jwt: string | null = null;
  private voiceService: VoiceService;
  public store: ChatStore;

  constructor(config: ChatConfig, eventHandler?: ChatEventHandler) {
    this.config = {
      reconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      debug: false,
      ...config,
    };
    this.sessionId = config.sessionId || generateId();
    this.eventHandler = eventHandler;

    // Initialize vanilla store
    this.store = new ChatStore();

    // Initialize voice service
    this.voiceService = new VoiceService({
      onRecordingStateChange: (isRecording) => {
        this.store.setRecording(isRecording);
        this.emit({ type: isRecording ? 'recording-start' : 'recording-stop' });
      },
      onSpeakingStateChange: (isSpeaking) => {
        this.store.setSpeaking(isSpeaking);
      },
    });
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.log('Already connected');
      return;
    }

    this.store.setConnecting(true);
    this.emit({ type: 'connecting' });

    try {
      // Authenticate first to get JWT token
      const jwt = await this.authenticate();

      // Build WebSocket URL with JWT token
      const url = this.buildWebSocketUrl(jwt);
      this.ws = new WebSocket(url);

      // Set WebSocket for voice service
      this.voiceService.setWebSocket(this.ws);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed';
      this.handleConnectionError(message);
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.store.setConnected(false);
    this.emit({ type: 'disconnected' });
  }

  /**
   * Send a text message
   */
  async sendMessage(content: string): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    if (!content.trim()) {
      return;
    }

    const messageId = generateId();
    const userMessage: Message = {
      id: messageId,
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
      type: 'text',
    };

    // Add user message to store
    this.store.removeStatusMessages();
    this.store.addMessage(userMessage);

    // Send to server with correct protocol format
    const wsMessage: WebSocketMessage = {
      type: WSMessageType.INPUT_TEXT,
      payload: {
        text: content.trim(),
      },
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(wsMessage));
    this.log('Sent message:', wsMessage);
  }

  /**
   * Clear all messages
   */
  clearMessages(): void {
    this.store.clearMessages();
  }

  /**
   * Send a control message (e.g., stop generation)
   */
  async sendControl(action: string, payload?: Record<string, unknown>): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const wsMessage: WebSocketMessage = {
      type: WSMessageType.CONTROL_CONFIG,
      payload: {
        ...(action !== 'config' ? { action } : {}),
        ...(payload || {}),
      },
      timestamp: Date.now(),
    };

    this.ws.send(JSON.stringify(wsMessage));
    this.log('Sent control:', wsMessage);
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Start voice recording
   */
  async startVoice(): Promise<void> {
    await this.voiceService.startRecording();
  }

  /**
   * Stop voice recording
   */
  stopVoice(): void {
    this.voiceService.stopRecording();
  }

  /**
   * Toggle voice recording
   */
  async toggleVoice(): Promise<void> {
    if (this.voiceService.getIsRecording()) {
      this.stopVoice();
    } else {
      await this.startVoice();
    }
  }

  /**
   * Get voice recording state
   */
  isRecording(): boolean {
    return this.voiceService.getIsRecording();
  }

  /**
   * Update language
   */
  setLanguage(lang: string): void {
    this.config.initialLanguage = lang;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendControl('config', { language: lang });
    }
  }

  /**
   * Get TTS speaking state
   */
  isSpeaking(): boolean {
    return this.voiceService.getIsSpeaking();
  }

  /**
   * Get TTS enabled state
   */
  getTtsEnabled(): boolean {
    return this.voiceService.getTtsEnabled();
  }

  getVolume(): number {
    return this.voiceService.getVolume();
  }

  /**
   * Toggle TTS on/off
   */
  toggleTTS(): void {
    const currentState = this.store.getState().ttsEnabled;
    const newState = !currentState;

    this.store.setTtsEnabled(newState);
    this.voiceService.setTtsEnabled(newState);

    // Send TTS config to server
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendControl('config', { ttsEnabled: newState });
    }
  }

  // Private methods

  private async authenticate(): Promise<string> {
    // Return cached JWT if available
    if (this.jwt) {
      return this.jwt;
    }

    // Convert WebSocket URL to HTTP for /init endpoint
    const baseUrl = this.config.serverUrl.replace(/^ws/, 'http').replace(/\/ws$/, '');

    this.log('Authenticating with /init endpoint:', `${baseUrl}/init`);

    const response = await fetch(`${baseUrl}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteToken: this.config.siteToken }),
    });

    if (!response.ok) {
      throw new Error('Authentication failed');
    }

    const data = await response.json();
    this.jwt = data.token;
    this.log('Authentication successful, JWT received');
    return data.token;
  }

  private buildWebSocketUrl(jwt: string): string {
    const url = new URL(this.config.serverUrl);

    // Add JWT token as query parameter
    url.searchParams.set('token', jwt);

    // Add optional language parameter
    if (this.config.initialLanguage) {
      url.searchParams.set('lang', this.config.initialLanguage);
    }

    // Add TTS enabled parameter
    url.searchParams.set('ttsEnabled', this.store.getState().ttsEnabled.toString());

    return url.toString();
  }

  private handleOpen(): void {
    this.log('WebSocket connected');
    this.reconnectAttempts = 0;
    this.store.setConnected(true);
    this.emit({ type: 'connected' });
  }

  private handleMessage(event: MessageEvent): void {
    // Handle binary audio data
    if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
      if (this.store.getState().ttsEnabled) {
        this.handleAudioMessage(event.data);
      }
      return;
    }

    try {
      const data = JSON.parse(event.data) as WebSocketMessage;
      this.log('Received message:', data);

      switch (data.type) {
        case WSMessageType.STREAM_STT:
          this.handleSttMessage(data);
          break;
        case WSMessageType.STREAM_LLM:
          this.handleLlmMessage(data);
          break;
        case WSMessageType.RESPONSE_START:
          this.handleResponseStart();
          break;
        case WSMessageType.RESPONSE_AUDIO_START:
          // Just a signal that audio is coming, actual speaking state is handled by playback
          break;
        case WSMessageType.RESPONSE_AUDIO_END:
          // Audio generation finished on server, remove "Generating voice..." status
          this.store.removeStatusMessages();
          break;
        case WSMessageType.RESPONSE_END:
          this.handleResponseEnd();
          break;
        case WSMessageType.ERROR:
          this.handleErrorMessage(data);
          break;
        case WSMessageType.STATUS:
          this.handleStatusMessage(data);
          break;
        case WSMessageType.AUDIO:
          // Handle base64 encoded audio
          if (this.store.getState().ttsEnabled) {
            this.handleBase64Audio(data);
          }
          break;
        case WSMessageType.SERVICE_MESSAGE:
          this.handleServiceMessage(data);
          break;
        default:
          this.log('Unknown message type:', data.type);
      }
    } catch (error) {
      this.log('Failed to parse message:', error);
    }
  }

  private handleSttMessage(data: any): void {
    const text = data.payload?.text || '';
    const isFinal = data.payload?.is_final || false;

    if (!text.trim()) return;

    // Get current messages from store
    const messages = this.store.getState().messages;
    const lastMsg = messages[messages.length - 1];

    if (isFinal) {
      // Final transcription - create or update user message
      if (lastMsg && lastMsg.role === 'user' && lastMsg.type === 'text' && !lastMsg.metadata?.finalized) {
        // Update existing interim message
        this.store.updateMessage(lastMsg.id, text);
        // Mark as finalized by updating the message
        const updatedMessages = messages.map(m =>
          m.id === lastMsg.id ? { ...m, metadata: { ...m.metadata, finalized: true } } : m
        );
        this.store.getState().messages = updatedMessages;
      } else {
        // Create new user message
        const message: Message = {
          id: generateId(),
          role: 'user',
          content: text,
          timestamp: Date.now(),
          type: 'text',
          metadata: { finalized: true },
        };
        this.store.addMessage(message);
      }
    } else {
      // Interim transcription
      if (lastMsg && lastMsg.role === 'user' && lastMsg.type === 'text' && !lastMsg.metadata?.finalized) {
        // Update existing interim message
        this.store.updateMessage(lastMsg.id, text);
      } else {
        // Create new interim user message
        const message: Message = {
          id: generateId(),
          role: 'user',
          content: text,
          timestamp: Date.now(),
          type: 'text',
          metadata: { finalized: false },
        };
        this.store.addMessage(message);
      }
    }
  }

  private handleLlmMessage(data: any): void {
    const delta = data.payload?.delta || '';
    const content = data.payload?.content || '';

    // Get current messages from store
    const messages = this.store.getState().messages;
    const lastMsg = messages[messages.length - 1];

    // Handle streaming LLM response - accumulate chunks
    if (lastMsg && lastMsg.role === 'assistant' && lastMsg.type !== 'status' && !this.currentMessageId) {
      // Append delta to existing assistant message
      this.store.removeStatusMessages();
      this.store.updateMessage(lastMsg.id, lastMsg.content + delta);
    } else if (!this.currentMessageId) {
      // New assistant message - start with delta or content
      this.store.removeStatusMessages();
      const initialContent = delta || content;
      const messageId = generateId();
      this.currentMessageId = messageId;

      const message: Message = {
        id: messageId,
        role: 'assistant',
        content: initialContent,
        timestamp: Date.now(),
        type: 'text',
      };

      this.store.addMessage(message);
      this.store.setTyping(true);
      this.emit({ type: 'typing-start' });
    } else {
      // Continue streaming - append delta
      const lastMessage = messages.find(m => m.id === this.currentMessageId);
      if (lastMessage) {
        this.store.updateMessage(this.currentMessageId, lastMessage.content + delta);
      }
    }
  }

  private handleResponseStart(): void {
    // New response started - reset status messages
    this.store.removeStatusMessages();
  }

  private handleResponseEnd(): void {
    // LLM/Response finished - hide typing cursor immediately
    if (this.currentMessageId) {
      this.store.setTyping(false);
      this.emit({ type: 'typing-end' });
      this.currentMessageId = null;
    }

    // Clear statuses only if TTS is not active (otherwise wait for RESPONSE_AUDIO_END)
    if (!this.store.getState().ttsEnabled) {
      this.store.removeStatusMessages();
    }
  }

  private handleErrorMessage(data: any): void {
    const errorMsg = data.payload?.message || 'An error occurred';
    
    // Clear any pending statuses and the current message stream on error
    this.store.removeStatusMessages();
    if (this.currentMessageId) {
      this.store.setTyping(false);
      this.emit({ type: 'typing-end' });
      this.currentMessageId = null;
    }

    // Add error message to chat
    const message: Message = {
      id: generateId(),
      role: 'assistant',
      content: errorMsg,
      timestamp: Date.now(),
      type: 'error',
    };
    this.store.addMessage(message);

    this.store.setError(errorMsg);
    this.emit({ type: 'error', data: errorMsg });
  }

  private handleStatusMessage(data: any): void {
    const payload = data.payload;
    if (!payload) return;

    const messages = this.store.getState().messages;
    const lastMsg = messages[messages.length - 1];
    const target = payload.target || 'bot';
    const role = target === 'user' ? 'user' : 'assistant';

    // If the last message is a status message with the same target, update it
    if (lastMsg && lastMsg.type === 'status' && lastMsg.metadata?.target === target) {
      this.store.updateMessageDetails(lastMsg.id, {
        content: payload.message || payload.status || 'Status update',
        timestamp: data.timestamp || Date.now(),
        metadata: {
          ...lastMsg.metadata,
          status: payload.status,
          target: payload.target,
          details: payload.details,
        },
      });
      this.log('Updated status message for target:', payload.target, payload.message);
    } else {
      // Create a new status message
      const message: Message = {
        id: data.id || generateId(),
        role: role,
        content: payload.message || payload.status || 'Status update',
        timestamp: data.timestamp || Date.now(),
        type: 'status',
        metadata: {
          status: payload.status,
          target: payload.target,
          details: payload.details,
        },
      };

      this.store.addMessage(message);
      this.log('Added new status message:', message);
    }
  }

  private handleServiceMessage(data: any): void {
    const payload = data.payload;
    if (!payload) return;

    // Clear statuses when a service notification arrives (e.g., retry request)
    this.store.removeStatusMessages();

    // Service messages are typically errors or instructions for the user
    // We'll treat them as system/assistant messages
    const target = payload.target || 'bot';
    const role = target === 'user' ? 'user' : 'assistant';

    const message: Message = {
      id: data.id || generateId(),
      role: role,
      content: payload.content || 'Service notification',
      timestamp: data.timestamp || Date.now(),
      type: 'error',
      metadata: {
        messageType: payload.messageType,
        localized: payload.localized,
        target: target,
      },
    };

    this.store.addMessage(message);
    this.log('Added service message:', message);
  }

  private async handleAudioMessage(audioData: Blob | ArrayBuffer): Promise<void> {
    // Play TTS audio from server
    try {
      await this.voiceService.playAudioChunk(audioData);
    } catch (error) {
      this.log('Failed to play audio:', error);
    }
  }

  private async handleBase64Audio(data: any): Promise<void> {
    // Handle base64 encoded audio
    const base64Data = data.payload?.data;
    const interactionId = data.payload?.context?.interaction_id;

    if (base64Data) {
      try {
        // Convert Base64 to ArrayBuffer
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        await this.voiceService.playAudioChunk(bytes.buffer, interactionId);
      } catch (error) {
        this.log('Failed to decode and play base64 audio:', error);
      }
    }
  }

  private handleError(event: Event): void {
    this.log('WebSocket error:', event);
    const message = 'Connection error occurred';
    this.handleConnectionError(message);
  }

  private handleClose(event: CloseEvent): void {
    this.log('WebSocket closed:', event.code, event.reason);

    // Handle 4401 (Unauthorized) - JWT token expired
    if (event.code === 4401) {
      this.log('JWT token expired, clearing cached token');
      this.jwt = null; // Clear JWT to force re-authentication
    }

    this.store.setConnected(false);
    this.emit({ type: 'disconnected' });

    // Attempt reconnection if enabled
    if (
      this.config.reconnect &&
      this.reconnectAttempts < (this.config.maxReconnectAttempts || 5) &&
      event.code !== 1000 // Not a normal closure
    ) {
      this.attemptReconnect();
    }
  }

  private handleConnectionError(message: string): void {
    this.store.setError(message);
    this.emit({ type: 'error', data: message });
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval || 3000;

    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch((error) => {
        this.log('Reconnection failed:', error);
      });
    }, delay);
  }

  private emit(event: ChatEvent): void {
    if (this.eventHandler) {
      this.eventHandler(event);
    }
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[ChatService]', ...args);
    }
  }
}
