/** A hard strike with short, fixed-frequency wooden resonances, without a pitch sweep. */
export function createWoodImpact(sampleRate: number): Float32Array {
  if (!Number.isFinite(sampleRate) || sampleRate < 16000 || sampleRate > 384000)
    throw new RangeError('Unsupported audio sample rate');
  const duration = 0.07;
  const samples = new Float32Array(Math.ceil(sampleRate * duration));
  const modes = [
    [920, 0.48, 0.017],
    [1680, 0.32, 0.011],
    [3080, 0.15, 0.006],
    [4750, 0.1, 0.0035],
  ] as const;
  let random = 0x4b1d;
  let peak = 0;
  for (let index = 0; index < samples.length; index++) {
    const time = index / sampleRate;
    random ^= random << 13;
    random ^= random >>> 17;
    random ^= random << 5;
    const strike = ((random >>> 0) / 0xffffffff) * 2 - 1;
    let value = 0.65 * strike * Math.exp(-time / 0.0018);
    for (const [frequency, amplitude, decay] of modes)
      value += amplitude * Math.sin(2 * Math.PI * frequency * time) * Math.exp(-time / decay);
    const attack = Math.min(1, time / 0.00008);
    const release = Math.min(1, (samples.length - 1 - index) / (sampleRate * 0.01));
    samples[index] = value * attack * release;
    peak = Math.max(peak, Math.abs(samples[index]!));
  }
  // Keep headroom even for the broadband front of the impact.
  if (peak > 0) for (let index = 0; index < samples.length; index++) samples[index]! *= 0.88 / peak;
  return samples;
}
