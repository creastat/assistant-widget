/**
 * Audio processing utilities for voice chat
 */

export interface AudioCallback {
  onAudioData: (data: ArrayBuffer) => void;
  onSilence?: () => void;
  onSpeechStart?: () => void;
}

export interface RecordingResources {
  mediaRecorder: MediaRecorder;
  mediaStream: MediaStream;
  audioContext: AudioContext;
  analyser: AnalyserNode;
  workletNode?: AudioWorkletNode;
  processorNode?: ScriptProcessorNode;
}

/**
 * Start recording audio from microphone
 * Captures raw PCM audio for streaming STT
 */
export async function startAudioRecording(
  callbacks: AudioCallback
): Promise<RecordingResources> {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone access not supported');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 16000,
    },
  });

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: 16000,
  });

  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();

  source.connect(analyser);
  analyser.fftSize = 2048;

  let workletNode: AudioWorkletNode | undefined;
  let processorNode: ScriptProcessorNode | undefined;

  try {
    // Create AudioWorklet as inline blob
    const workletCode = `class AudioCaptureProcessor extends AudioWorkletProcessor{constructor(){super(),this.chunkCount=0}process(r,t,e){const o=r[0];if(!o||!o[0])return!0;const s=o[0],n=new Int16Array(s.length);for(let r=0;r<s.length;r++){const t=Math.max(-1,Math.min(1,s[r]));n[r]=t<0?32768*t:32767*t}return this.port.postMessage({audioData:n.buffer,length:n.length},[n.buffer]),this.chunkCount++,!0}}registerProcessor("audio-capture-processor",AudioCaptureProcessor);`;

    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(blob);

    await audioContext.audioWorklet.addModule(workletUrl);

    workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
    });

    let audioBuffer: ArrayBuffer[] = [];
    const BATCH_SIZE = 16; // ~128ms
    const SPEECH_THRESHOLD = 0.05; // RMS threshold for speech detection
    const SILENCE_DURATION = 1000; // ms to wait before declaring silence
    const REQUIRED_SPEECH_CHUNKS = 2; // Require 2 consecutive chunks to trigger speech

    let isSpeaking = false;
    let silenceStartTime = 0;
    let consecutiveSpeechChunks = 0;

    // Helper function to calculate RMS energy of audio chunk
    const calculateRMS = (buffer: ArrayBuffer): number => {
      const pcmData = new Int16Array(buffer);
      let sum = 0.0;
      for (let i = 0; i < pcmData.length; i++) {
        const normalized = pcmData[i] / 32768.0;
        sum += normalized * normalized;
      }
      return Math.sqrt(sum / pcmData.length);
    };

    workletNode.port.onmessage = (event) => {
      const { audioData } = event.data;
      audioBuffer.push(audioData);

      if (audioBuffer.length >= BATCH_SIZE) {
        const totalLength = audioBuffer.reduce((sum, buf) => sum + buf.byteLength, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const buf of audioBuffer) {
          combined.set(new Uint8Array(buf), offset);
          offset += buf.byteLength;
        }

        const rms = calculateRMS(combined.buffer);
        const now = Date.now();

        if (rms > SPEECH_THRESHOLD) {
          consecutiveSpeechChunks++;

          if (consecutiveSpeechChunks >= REQUIRED_SPEECH_CHUNKS) {
            // Speech detected
            if (!isSpeaking) {
              isSpeaking = true;
              callbacks.onSpeechStart?.();
            }

            // Reset silence timer
            silenceStartTime = 0;

            // Send audio data only when speech is detected
            callbacks.onAudioData(combined.buffer);
          } else if (isSpeaking) {
            // Already speaking, continue sending even if just 1 chunk (to avoid gaps)
            silenceStartTime = 0;
            callbacks.onAudioData(combined.buffer);
          }
        } else {
          // Below threshold
          consecutiveSpeechChunks = 0;

          if (isSpeaking) {
            if (silenceStartTime === 0) {
              silenceStartTime = now;
            } else if (now - silenceStartTime > SILENCE_DURATION) {
              // Silence detected after speech
              isSpeaking = false;
              silenceStartTime = 0;
              callbacks.onSilence?.();
            } else {
              // Still in "hold" period, send audio (trailing silence)
              callbacks.onAudioData(combined.buffer);
            }
          }
          // If not speaking, drop the chunk (don't send noise)
        }

        audioBuffer = [];
      }
    };

    source.connect(workletNode);
    workletNode.connect(audioContext.destination);

  } catch (error) {
    console.error('AudioWorklet failed, falling back to ScriptProcessorNode:', error);

    // Fallback to ScriptProcessorNode with VAD
    processorNode = audioContext.createScriptProcessor(4096, 1, 1);

    const SPEECH_THRESHOLD = 0.05;
    const SILENCE_DURATION = 1000;
    const REQUIRED_SPEECH_CHUNKS = 2;

    let isSpeaking = false;
    let silenceStartTime = 0;
    let consecutiveSpeechChunks = 0;

    // Helper function to calculate RMS energy
    const calculateRMS = (data: Float32Array): number => {
      let sum = 0.0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i] * data[i];
      }
      return Math.sqrt(sum / data.length);
    };

    processorNode.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      const rms = calculateRMS(inputData);
      const now = Date.now();

      const pcmData = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      if (rms > SPEECH_THRESHOLD) {
        consecutiveSpeechChunks++;

        if (consecutiveSpeechChunks >= REQUIRED_SPEECH_CHUNKS) {
          if (!isSpeaking) {
            isSpeaking = true;
            callbacks.onSpeechStart?.();
          }
          silenceStartTime = 0;
          callbacks.onAudioData(pcmData.buffer);
        } else if (isSpeaking) {
          silenceStartTime = 0;
          callbacks.onAudioData(pcmData.buffer);
        }
      } else {
        consecutiveSpeechChunks = 0;

        if (isSpeaking) {
          if (silenceStartTime === 0) {
            silenceStartTime = now;
          } else if (now - silenceStartTime > SILENCE_DURATION) {
            isSpeaking = false;
            silenceStartTime = 0;
            callbacks.onSilence?.();
          } else {
            callbacks.onAudioData(pcmData.buffer);
          }
        }
      }
    };

    source.connect(processorNode);
    processorNode.connect(audioContext.destination);
  }

  // Create MediaRecorder for fallback/simple recording
  const mediaRecorder = new MediaRecorder(stream);

  return {
    mediaRecorder,
    mediaStream: stream,
    audioContext,
    analyser,
    workletNode,
    processorNode,
  };
}

/**
 * Stop audio recording and cleanup resources
 */
export function stopAudioRecording(resources: Partial<RecordingResources>): void {
  if (resources.workletNode) {
    resources.workletNode.disconnect();
  }

  if (resources.processorNode) {
    resources.processorNode.disconnect();
  }

  if (resources.mediaStream) {
    resources.mediaStream.getTracks().forEach((track) => track.stop());
  }

  if (resources.audioContext && resources.audioContext.state !== 'closed') {
    resources.audioContext.close();
  }
}

/**
 * Audio playback manager for TTS
 */
export class AudioPlaybackManager {
  private audioContext: AudioContext | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private playbackStartCallback?: () => void;
  private playbackEndCallback?: () => void;
  private currentInteractionId: string | null = null;

  async initialize() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000, // Default for most TTS
      });
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.connect(this.audioContext.destination);
    }
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume AudioContext:', error);
      }
    }
  }

  onPlaybackStart(callback: () => void) {
    this.playbackStartCallback = callback;
  }

  onPlaybackEnd(callback: () => void) {
    this.playbackEndCallback = callback;
  }

  async playAudioChunk(audioData: ArrayBuffer | Blob, interactionId?: string): Promise<void> {
    // If new interaction, clear queue
    if (interactionId && interactionId !== this.currentInteractionId) {
      this.stopTTS();
      this.audioQueue = [];
      this.currentInteractionId = interactionId;
    }

    // Convert Blob to ArrayBuffer if needed
    let buffer: ArrayBuffer;
    if (audioData instanceof Blob) {
      buffer = await audioData.arrayBuffer();
    } else {
      buffer = audioData;
    }

    if (!this.audioContext) await this.initialize();

    if (this.audioContext && this.audioContext.state !== 'running') {
      try {
        await this.audioContext.resume();
      } catch (e) {}
    }

    try {
      // Assuming raw PCM signed 16-bit little-endian at 24000 Hz if decodeAudioData fails
      // This matches the creastat implementation for raw streaming
      this.audioQueue.push(buffer);

      if (!this.isPlaying) {
        this.playNext();
      }
    } catch (error) {
      console.error('Error processing audio:', error);
    }
  }

  private pcmToAudioBuffer(arrayBuffer: ArrayBuffer, sampleRate: number, channels: number): AudioBuffer {
    const pcmData = new Int16Array(arrayBuffer);
    const audioBuffer = this.audioContext!.createBuffer(channels, pcmData.length / channels, sampleRate);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 32768.0;
    }
    return audioBuffer;
  }

  private async playNext() {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.currentInteractionId = null;
      this.playbackEndCallback?.();
      return;
    }

    if (!this.audioContext) await this.initialize();

    const audioData = this.audioQueue.shift()!;

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.playbackStartCallback?.();
    }

    try {
      // First try PCM conversion (as used in creastat for streaming)
      // Most high-performance TTS streaming uses raw PCM
      const audioBuffer = this.pcmToAudioBuffer(audioData, 24000, 1);
      const source = this.audioContext!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.analyser!);

      this.currentSource = source;

      source.onended = () => {
        this.currentSource = null;
        this.playNext();
      };

      source.start(0);
    } catch (error) {
      // Fallback to decodeAudioData if it's a standard format (mp3/wav chunk)
      try {
        const audioBuffer = await this.audioContext!.decodeAudioData(audioData.slice(0));
        const source = this.audioContext!.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.analyser!);

        this.currentSource = source;

        source.onended = () => {
          this.currentSource = null;
          this.playNext();
        };

        source.start(0);
      } catch (fallbackError) {
        console.error('Failed to play audio chunk with both PCM and decodeAudioData:', fallbackError);
        this.playNext();
      }
    }
  }

  stopTTS() {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    this.audioQueue = [];
    this.isPlaying = false;
    this.currentInteractionId = null;
    this.playbackEndCallback?.();
  }

  getVolume(): number {
    if (!this.analyser || !this.isPlaying) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(dataArray);
    
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = (dataArray[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / dataArray.length);
  }

  cancel() {
    this.stopTTS();
  }
}
