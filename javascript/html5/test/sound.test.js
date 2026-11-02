import { describe, expect, it, vi } from 'vitest';
import { playRollSound } from '../src/sound.js';

function audioParam() {
  return {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  };
}

function audioNode(extra = {}) {
  return {
    connect: vi.fn((destination) => destination),
    start: vi.fn(),
    stop: vi.fn(),
    ...extra,
  };
}

describe('synthesized roll sound', () => {
  it('[TC-SOUND-01] [FR-012] [NFR-006] FEATURE: Roll sound SCENARIO: Skip muted or unavailable audio GIVEN sound is muted or Web Audio is unavailable WHEN a roll sound is requested THEN the game continues without attempting unavailable audio', () => {
    playRollSound(true);
    vi.stubGlobal('window', undefined);
    playRollSound();
    vi.unstubAllGlobals();
    window.AudioContext = undefined;
    window.webkitAudioContext = undefined;
    playRollSound();
  });

  it('[TC-SOUND-02] [FR-012] FEATURE: Roll sound SCENARIO: Synthesize roll audio GIVEN Web Audio is available WHEN a roll sound is requested THEN filtered roll noise and four impacts are scheduled AND a suspended context is resumed', () => {
    let context;
    class FakeAudioContext {
      constructor() {
        context = this;
        this.currentTime = 1;
        this.sampleRate = 100;
        this.state = 'suspended';
        this.destination = {};
        this.createBuffer = vi.fn(() => ({ getChannelData: () => new Float32Array(20) }));
        this.createBufferSource = vi.fn(() => audioNode());
        this.createBiquadFilter = vi.fn(() => audioNode({ frequency: audioParam() }));
        this.createGain = vi.fn(() => audioNode({ gain: audioParam() }));
        this.createOscillator = vi.fn(() =>
          audioNode({
            frequency: audioParam(),
            type: 'sine',
          }),
        );
        this.resume = vi.fn(() => {
          this.state = 'running';
          return Promise.resolve();
        });
      }
    }

    window.AudioContext = FakeAudioContext;
    playRollSound();
    expect(context.resume).toHaveBeenCalledOnce();
    expect(context.createBufferSource).toHaveBeenCalledOnce();
    expect(context.createOscillator).toHaveBeenCalledTimes(4);
    expect(context.createGain).toHaveBeenCalledTimes(5);
    expect(context.createBiquadFilter).toHaveBeenCalledOnce();
    playRollSound();
    expect(context.resume).toHaveBeenCalledOnce();
  });
});
