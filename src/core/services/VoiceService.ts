import { startAudioRecording, stopAudioRecording, AudioPlaybackManager, RecordingResources } from '../utils/audio';
import type { WebSocketMessage } from '../types';
import { WSMessageType } from '../types';

export interface VoiceServiceCallbacks {
  onRecordingStateChange?: (isRecording: boolean) => void;
  onSpeakingStateChange?: (isSpeaking: boolean) => void;
  onInteractionStart?: (id: string) => void;
}

export class VoiceService {
  private webSocket: WebSocket | null = null;
  private recordingResources: Partial<RecordingResources> = {};
  private audioPlayback: AudioPlaybackManager;

  private isRecording = false;
  private isSpeaking = false;
  private ttsEnabled = false;
  private currentInteractionId: string | null = null;

  private callbacks: VoiceServiceCallbacks;

  constructor(callbacks: VoiceServiceCallbacks = {}) {
    this.callbacks = callbacks;
    this.audioPlayback = new AudioPlaybackManager();

    // Setup playback callbacks
    this.audioPlayback.onPlaybackStart(() => {
      this.isSpeaking = true;
      this.callbacks.onSpeakingStateChange?.(true);
    });

    this.audioPlayback.onPlaybackEnd(() => {
      this.isSpeaking = false;
      this.callbacks.onSpeakingStateChange?.(false);
    });
  }

  setWebSocket(ws: WebSocket) {
    this.webSocket = ws;
  }

  async startRecording(): Promise<void> {
    if (!this.webSocket || this.webSocket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    if (this.isRecording) {
      return; // Already recording
    }

    try {
      this.isRecording = true;
      this.callbacks.onRecordingStateChange?.(true);

      this.recordingResources = await startAudioRecording({
        onAudioData: (data) => {
          if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
            // Send raw PCM audio data to server
            this.webSocket.send(data);
          }
        },
        onSilence: () => {
          // Notify server that speech ended
          if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN && this.currentInteractionId) {
            const endMessage: WebSocketMessage = {
              type: WSMessageType.INPUT_END,
              payload: {
                interactionId: this.currentInteractionId,
              },
              timestamp: Date.now(),
            };
            this.webSocket.send(JSON.stringify(endMessage));
          }
        },
        onSpeechStart: () => {
          // Start of new speech interaction
          this.currentInteractionId = this.generateInteractionId();

          if (this.callbacks.onInteractionStart) {
            this.callbacks.onInteractionStart(this.currentInteractionId);
          }

          // Stop any ongoing TTS immediately when user starts speaking
          this.audioPlayback.stopTTS();
        },
      });
    } catch (error) {
      this.isRecording = false;
      this.callbacks.onRecordingStateChange?.(false);
      throw error;
    }
  }

  stopRecording(): void {
    if (!this.isRecording) {
      return;
    }

    this.isRecording = false;
    stopAudioRecording(this.recordingResources);
    this.recordingResources = {};
    this.currentInteractionId = null;
    this.callbacks.onRecordingStateChange?.(false);
  }

  async playAudioChunk(audioData: ArrayBuffer | Blob, interactionId?: string): Promise<void> {
    // Only play if TTS is enabled
    if (this.ttsEnabled) {
      await this.audioPlayback.playAudioChunk(audioData, interactionId);
    }
  }

  stopPlayback(): void {
    this.audioPlayback.stopTTS();
  }

  cancel(): void {
    this.stopPlayback();
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }

  setTtsEnabled(enabled: boolean): void {
    this.ttsEnabled = enabled;
    // If disabling TTS, stop any ongoing playback
    if (!enabled) {
      this.stopPlayback();
    }
  }

  getTtsEnabled(): boolean {
    return this.ttsEnabled;
  }

  getVolume(): number {
    return this.audioPlayback.getVolume();
  }

  private generateInteractionId(): string {
    return `interaction-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
