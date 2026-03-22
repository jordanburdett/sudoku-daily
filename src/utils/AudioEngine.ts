export class AudioEngine {
  private ctx: AudioContext | null = null

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') this.ctx.resume()
    return this.ctx
  }

  // 1. Digit tick — 280Hz sine, 60ms
  playDigitTick(): void {
    const ctx = this.getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'; osc.frequency.value = 280
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.06)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.06)
  }

  // 2. Notes blip — 500Hz triangle, 80ms
  playNotesBlip(): void {
    const ctx = this.getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'triangle'; osc.frequency.value = 500
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08)
  }

  // 3. Erase swipe — white noise burst, 40ms
  playEraseSwipe(): void {
    const ctx = this.getCtx()
    const bufferSize = Math.ceil(ctx.sampleRate * 0.04)
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const gain = ctx.createGain()
    source.connect(gain); gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.04)
    source.start(ctx.currentTime)
  }

  // 4. Conflict buzz — 150Hz sine, 100ms
  playConflictBuzz(): void {
    const ctx = this.getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'; osc.frequency.value = 150
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1)
  }

  // 5. Win chime — ascending 4-note sequence: 523, 659, 784, 1047Hz
  playWinChime(): void {
    const ctx = this.getCtx()
    const freqs = [523, 659, 784, 1047]
    freqs.forEach((freq, i) => {
      const t = ctx.currentTime + i * 0.1 // 100ms apart
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.type = 'sine'; osc.frequency.value = freq
      gain.gain.setValueAtTime(0.35, t)
      gain.gain.linearRampToValueAtTime(0, t + 0.18)
      osc.start(t); osc.stop(t + 0.18)
    })
  }

  // 6. Undo pop — pitch glide 400→280Hz, 80ms
  playUndoPop(): void {
    const ctx = this.getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(400, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(280, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.08)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.08)
  }
}
