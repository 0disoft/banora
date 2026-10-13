import { expect, test } from 'bun:test';
import { RecordController } from '@0disoft/banora';
import { isPlacementStep } from '../examples/studio/placement-sound.js';
import { StudioWorkspace } from '../examples/studio/workspace.js';
import { createWoodImpact } from '../examples/studio/wood-impact.js';

test('wood impact is finite, unclipped and concentrates energy in the strike', () => {
  for (const sampleRate of [44100, 48000]) {
    const samples = createWoodImpact(sampleRate);
    let peak = 0;
    let strikeEnergy = 0;
    let tailEnergy = 0;
    for (let index = 0; index < samples.length; index++) {
      const value = samples[index]!;
      if (!Number.isFinite(value)) throw new Error('Nonfinite audio sample');
      peak = Math.max(peak, Math.abs(value));
      if (index < sampleRate * 0.01) strikeEnergy += value * value;
      if (index >= sampleRate * 0.06) tailEnergy += value * value;
    }
    expect(peak).toBeGreaterThan(0.5);
    expect(peak).toBeLessThan(1);
    expect(strikeEnergy).toBeGreaterThan(tailEnergy * 100);
    expect(Math.abs(samples[0]!)).toBe(0);
    expect(Math.abs(samples.at(-1)!)).toBe(0);
  }
});

test('placement sound identifies recorded/edited stones while ignoring passes, comments and imports', () => {
  const controller = new RecordController({ sgf: '(;SZ[19];B[aa]MN[50];W[])' });
  let previous = controller.getState();
  controller.next();
  expect(isPlacementStep(previous, controller.getState())).toBe(true);
  previous = controller.getState();
  controller.setComment('note');
  expect(isPlacementStep(previous, controller.getState())).toBe(false);
  previous = controller.getState();
  controller.next();
  expect(isPlacementStep(previous, controller.getState())).toBe(false);
  previous = controller.getState();
  controller.play({ x: 1, y: 1 });
  expect(isPlacementStep(previous, controller.getState())).toBe(true);
  previous = controller.getState();
  controller.previous();
  expect(isPlacementStep(previous, controller.getState())).toBe(false);
  previous = controller.getState();
  controller.loadSgf('(;SZ[19];B[aa])', { discardChanges: true });
  expect(isPlacementStep(previous, controller.getState())).toBe(false);
  controller.dispose();
});
test('switches between boards with colliding node ids cannot create a sound', () => {
  const workspace = new StudioWorkspace();
  const first = workspace.active.id;
  workspace.controller.play({ x: 0, y: 0 });
  workspace.add();
  const previous = workspace.controller.getState();
  workspace.select(first);
  expect(isPlacementStep(previous, workspace.controller.getState())).toBe(false);
  workspace.dispose();
});
