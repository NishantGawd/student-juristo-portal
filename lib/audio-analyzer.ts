/**
 * AudioAnalyzer - Real-time frequency analysis for waveform visualization
 * Uses Web Audio API to capture live frequency data from microphone input
 */

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStreamAudioSourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private dataArray: Uint8Array | null = null;
  private onDataUpdate: ((data: number[]) => void) | null = null;
  private isActive: boolean = false;

  /**
   * Initialize the audio analyzer with a media stream
   */
  async initialize(stream: MediaStream, onUpdate: (data: number[]) => void) {
    try {
      // Get or create audio context
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Resume audio context if suspended
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Create analyser node if needed
      if (!this.analyser) {
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256; // Frequency bin resolution
        this.analyser.smoothingTimeConstant = 0.8; // Smooth frequency transitions
      }

      // Create media stream audio source if needed
      if (!this.mediaStreamAudioSourceNode) {
        this.mediaStreamAudioSourceNode = this.audioContext.createMediaStreamSource(stream);
        this.mediaStreamAudioSourceNode.connect(this.analyser);
      }

      // Initialize data array
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      this.onDataUpdate = onUpdate;
      this.isActive = true;

      // Start animation loop
      this.updateFrequencyData();
    } catch (error) {
      console.error('[v0] AudioAnalyzer initialization error:', error);
      this.isActive = false;
    }
  }

  /**
   * Update frequency data and call the callback
   */
  private updateFrequencyData = () => {
    if (!this.isActive || !this.analyser || !this.onDataUpdate || !this.dataArray) {
      return;
    }

    // Get frequency data
    this.analyser.getByteFrequencyData(this.dataArray as any);

    // Process frequency data to get waveform bar heights
    // We'll divide the frequency spectrum into 13 bars for the waveform
    const barCount = 13;
    const bufferLength = this.dataArray.length;
    const barWidth = Math.floor(bufferLength / barCount);
    const heights: number[] = [];

    for (let i = 0; i < barCount; i++) {
      let sum = 0;
      for (let j = 0; j < barWidth; j++) {
        sum += this.dataArray[i * barWidth + j];
      }
      const average = sum / barWidth;

      // Normalize to 0-24px range (matching UI design)
      // Use logarithmic scaling for better visual distribution
      const normalizedHeight = Math.max(2, Math.min(24, (average / 255) * 24));
      heights.push(normalizedHeight);
    }

    this.onDataUpdate(heights);

    // Continue animation loop
    this.animationFrameId = requestAnimationFrame(this.updateFrequencyData);
  };

  /**
   * Stop the analyzer and clean up resources
   */
  stop() {
    this.isActive = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaStreamAudioSourceNode) {
      this.mediaStreamAudioSourceNode.disconnect();
    }

    if (this.analyser) {
      this.analyser.disconnect();
    }

    // Note: Don't close audioContext as it may be reused
    // The context will be cleaned up when the component unmounts
  }

  /**
   * Reset to initial state
   */
  reset() {
    this.stop();
    this.mediaStreamAudioSourceNode = null;
    this.analyser = null;
    this.audioContext = null;
    this.dataArray = null;
    this.onDataUpdate = null;
  }
}

/**
 * React hook for using AudioAnalyzer
 */
import { useRef, useCallback, useEffect, useState } from 'react';

export function useAudioAnalyzer() {
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const [waveformHeights, setWaveformHeights] = useState<number[]>(
    Array(13).fill(4) // Initial flat waveform
  );

  const start = useCallback(async (stream: MediaStream) => {
    if (!analyzerRef.current) {
      analyzerRef.current = new AudioAnalyzer();
    }

    await analyzerRef.current.initialize(stream, (heights) => {
      setWaveformHeights(heights);
    });
  }, []);

  const stop = useCallback(() => {
    if (analyzerRef.current) {
      analyzerRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    if (analyzerRef.current) {
      analyzerRef.current.reset();
      analyzerRef.current = null;
    }
    setWaveformHeights(Array(13).fill(4));
  }, []);

  useEffect(() => {
    return () => {
      if (analyzerRef.current) {
        analyzerRef.current.reset();
      }
    };
  }, []);

  return {
    waveformHeights,
    start,
    stop,
    reset,
  };
}
