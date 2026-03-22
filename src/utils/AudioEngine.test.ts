import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AudioEngine } from './AudioEngine'

// ---------------------------------------------------------------------------
// Minimal Web Audio API mock
// The key requirement: `vi.stubGlobal('AudioContext', ...)` needs a real
// constructor function (class or function that can be called with `new`).
// We use `vi.fn()` with a factory that returns a fresh mock instance object.
// ---------------------------------------------------------------------------

interface MockOscillator {
  type: OscillatorType
  frequency: {
    value: number
    setValueAtTime: ReturnType<typeof vi.fn>
    linearRampToValueAtTime: ReturnType<typeof vi.fn>
  }
  connect: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
}

interface MockGain {
  gain: {
    value: number
    setValueAtTime: ReturnType<typeof vi.fn>
    linearRampToValueAtTime: ReturnType<typeof vi.fn>
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>
  }
  connect: ReturnType<typeof vi.fn>
}

interface MockBufferSrc {
  buffer: AudioBuffer | null
  connect: ReturnType<typeof vi.fn>
  start: ReturnType<typeof vi.fn>
}

interface MockCtx {
  state: AudioContextState
  currentTime: number
  sampleRate: number
  destination: object
  resume: ReturnType<typeof vi.fn>
  createOscillator: ReturnType<typeof vi.fn>
  createGain: ReturnType<typeof vi.fn>
  createBufferSource: ReturnType<typeof vi.fn>
  createBuffer: ReturnType<typeof vi.fn>
}

function makeOscillator(): MockOscillator {
  return {
    type: 'sine',
    frequency: {
      value: 440,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
}

function makeGain(): MockGain {
  return {
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  }
}

function makeBufferSource(): MockBufferSrc {
  return {
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
  }
}

function makeAudioBuffer() {
  return {
    getChannelData: vi.fn(() => new Float32Array(100)),
  }
}

function makeCtx(state: AudioContextState = 'running'): MockCtx {
  return {
    state,
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    resume: vi.fn(),
    createOscillator: vi.fn(makeOscillator),
    createGain: vi.fn(makeGain),
    createBufferSource: vi.fn(makeBufferSource),
    createBuffer: vi.fn(() => makeAudioBuffer()),
  }
}

/**
 * Stubs global AudioContext with a constructor that returns `ctx`.
 * Uses a real `function` so `new AudioContext()` works.
 */
function stubAudioContext(ctx: MockCtx) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctor = vi.fn(function (this: any) {
    // copy every property of ctx onto `this`
    Object.assign(this, ctx)
  })
  vi.stubGlobal('AudioContext', ctor)
  return ctor
}

beforeEach(() => {
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AudioEngine', () => {
  describe('AudioContext lazy initialization', () => {
    it('creates an AudioContext on first use', () => {
      const ctx = makeCtx()
      const ctor = stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playDigitTick()
      expect(ctor).toHaveBeenCalledOnce()
    })

    it('reuses the same AudioContext across multiple calls', () => {
      const ctx = makeCtx()
      const ctor = stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playDigitTick()
      engine.playDigitTick()
      expect(ctor).toHaveBeenCalledOnce()
    })

    it('resumes a suspended context automatically', () => {
      const ctx = makeCtx('suspended')
      stubAudioContext(ctx)
      // After construction `this` is a copy of ctx, but `resume` is the same vi.fn reference
      const engine = new AudioEngine()
      engine.playDigitTick()
      // The resume fn on the ctx object should have been called
      expect(ctx.resume).toHaveBeenCalled()
    })

    it('does not call resume for a running context', () => {
      const ctx = makeCtx('running')
      stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playDigitTick()
      expect(ctx.resume).not.toHaveBeenCalled()
    })
  })

  describe('playDigitTick', () => {
    it('creates oscillator and gain, connects them, schedules start/stop', () => {
      const ctx = makeCtx()
      stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playDigitTick()

      expect(ctx.createOscillator).toHaveBeenCalledOnce()
      expect(ctx.createGain).toHaveBeenCalledOnce()

      const osc = ctx.createOscillator.mock.results[0].value as MockOscillator
      const gain = ctx.createGain.mock.results[0].value as MockGain

      expect(osc.type).toBe('sine')
      expect(osc.frequency.value).toBe(280)
      expect(osc.connect).toHaveBeenCalled()
      expect(gain.connect).toHaveBeenCalled()
      expect(osc.start).toHaveBeenCalled()
      expect(osc.stop).toHaveBeenCalled()

      // Duration = 60ms = 0.06s
      const stopTime = (osc.stop.mock.calls[0] as [number])[0]
      expect(stopTime).toBeCloseTo(0.06, 5)
    })

    it('sets initial gain to 0.3 and linear ramps to 0 at 0.06s', () => {
      const ctx = makeCtx()
      stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playDigitTick()

      const gain = ctx.createGain.mock.results[0].value as MockGain
      expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.3, 0)
      expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.06)
    })
  })

  describe('playNotesBlip', () => {
    it('uses triangle oscillator at 500Hz for 80ms', () => {
      const ctx = makeCtx()
      stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playNotesBlip()

      const osc = ctx.createOscillator.mock.results[0].value as MockOscillator
      expect(osc.type).toBe('triangle')
      expect(osc.frequency.value).toBe(500)

      const stopTime = (osc.stop.mock.calls[0] as [number])[0]
      expect(stopTime).toBeCloseTo(0.08, 5)
    })

    it('sets initial gain to 0.2', () => {
      const ctx = makeCtx()
      stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playNotesBlip()

      const gain = ctx.createGain.mock.results[0].value as MockGain
      expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.2, 0)
    })
  })

  describe('playEraseSwipe', () => {
    it('creates a buffer source (white noise) and starts it', () => {
      const ctx = makeCtx()
      stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playEraseSwipe()

      expect(ctx.createBuffer).toHaveBeenCalledOnce()
      expect(ctx.createBufferSource).toHaveBeenCalledOnce()

      const source = ctx.createBufferSource.mock.results[0].value as MockBufferSrc
      expect(source.start).toHaveBeenCalled()
    })

    it('requests a 40ms buffer at the context sample rate (44100 → 1764 frames)', () => {
      const ctx = makeCtx()
      stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playEraseSwipe()

      const callArgs = ctx.createBuffer.mock.calls[0] as [number, number, number]
      const bufferSize = callArgs[1]
      const sampleRate = callArgs[2]
      expect(sampleRate).toBe(44100)
      expect(bufferSize).toBe(Math.ceil(44100 * 0.04)) // 1764
    })

    it('sets initial gain to 0.15 and ramps to 0 at 0.04s', () => {
      const ctx = makeCtx()
      stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playEraseSwipe()

      const gain = ctx.createGain.mock.results[0].value as MockGain
      expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.15, 0)
      expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.04)
    })
  })

  describe('playConflictBuzz', () => {
    it('uses sine oscillator at 150Hz for 100ms', () => {
      const ctx = makeCtx()
      stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playConflictBuzz()

      const osc = ctx.createOscillator.mock.results[0].value as MockOscillator
      expect(osc.type).toBe('sine')
      expect(osc.frequency.value).toBe(150)

      const stopTime = (osc.stop.mock.calls[0] as [number])[0]
      expect(stopTime).toBeCloseTo(0.1, 5)
    })

    it('uses exponential gain ramp for buzz decay (to 0.001)', () => {
      const ctx = makeCtx()
      stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playConflictBuzz()

      const gain = ctx.createGain.mock.results[0].value as MockGain
      expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.25, 0)
      expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 0.1)
    })
  })

  describe('playWinChime', () => {
    it('creates exactly 4 oscillators and 4 gain nodes', () => {
      const ctx = makeCtx()
      stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playWinChime()

      expect(ctx.createOscillator).toHaveBeenCalledTimes(4)
      expect(ctx.createGain).toHaveBeenCalledTimes(4)
    })

    it('uses the correct ascending frequencies: 523, 659, 784, 1047 Hz', () => {
      const ctx = makeCtx()
      stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playWinChime()

      const expectedFreqs = [523, 659, 784, 1047]
      ctx.createOscillator.mock.results.forEach((result, i) => {
        const osc = result.value as MockOscillator
        expect(osc.frequency.value).toBe(expectedFreqs[i])
      })
    })

    it('staggers each note 100ms apart', () => {
      const ctx = makeCtx()
      stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playWinChime()

      ctx.createOscillator.mock.results.forEach((result, i) => {
        const osc = result.value as MockOscillator
        const startTime = (osc.start.mock.calls[0] as [number])[0]
        expect(startTime).toBeCloseTo(i * 0.1, 5)
      })
    })

    it('sets gain to 0.35 for each note, starting at the note offset time', () => {
      const ctx = makeCtx()
      stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playWinChime()

      ctx.createGain.mock.results.forEach((result, i) => {
        const gain = result.value as MockGain
        const [gainValue, atTime] = gain.gain.setValueAtTime.mock.calls[0] as [number, number]
        expect(gainValue).toBe(0.35)
        expect(atTime).toBeCloseTo(i * 0.1, 5)
      })
    })

    it('all oscillators are sine type', () => {
      const ctx = makeCtx()
      stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playWinChime()

      ctx.createOscillator.mock.results.forEach((result) => {
        const osc = result.value as MockOscillator
        expect(osc.type).toBe('sine')
      })
    })
  })

  describe('playUndoPop', () => {
    it('uses pitch glide from 400Hz down to 280Hz over 80ms', () => {
      const ctx = makeCtx()
      stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playUndoPop()

      const osc = ctx.createOscillator.mock.results[0].value as MockOscillator
      expect(osc.type).toBe('sine')
      expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(400, 0)
      expect(osc.frequency.linearRampToValueAtTime).toHaveBeenCalledWith(280, 0.08)

      const stopTime = (osc.stop.mock.calls[0] as [number])[0]
      expect(stopTime).toBeCloseTo(0.08, 5)
    })

    it('sets initial gain to 0.25 and ramps to 0 at 0.08s', () => {
      const ctx = makeCtx()
      stubAudioContext(ctx)
      const engine = new AudioEngine()
      engine.playUndoPop()

      const gain = ctx.createGain.mock.results[0].value as MockGain
      expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(0.25, 0)
      expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.08)
    })
  })

  describe('independent engine instances', () => {
    it('two engines each create their own AudioContext', () => {
      const ctx1 = makeCtx()
      const ctx2 = makeCtx()
      // Need two separate constructors; stub the second after first call
      let callCount = 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctor = vi.fn(function (this: any) {
        if (callCount === 0) { Object.assign(this, ctx1) }
        else { Object.assign(this, ctx2) }
        callCount++
      })
      vi.stubGlobal('AudioContext', ctor)

      const engine1 = new AudioEngine()
      const engine2 = new AudioEngine()
      engine1.playDigitTick()
      engine2.playDigitTick()
      expect(ctor).toHaveBeenCalledTimes(2)
    })
  })
})
