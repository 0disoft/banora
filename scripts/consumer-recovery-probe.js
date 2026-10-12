// Copied into an isolated installed consumer. Imports resolve to its reviewed tarballs only.
import assert from 'node:assert/strict';
import { RecordController, parseRecordCheckpoint, serializeSgf } from '@0disoft/banora';
import { executeAutomation } from '@0disoft/banora/automation';

const mode = process.argv[2];
assert(['create', 'restore'].includes(mode));
const controller = new RecordController({
  sgf:
    '(;FF[4]GM[1]SZ[5]GN[Authored first game]XX[keep])' +
    '(;FF[4]GM[1]SZ[9]AB[hh]AW[ii]GN[Authored study];B[aa]' +
    '(;W[bb])(;W[cc]MN[42]C[original];B[];W[]))',
  rules: { ko: 'situational-superko', passStones: true },
});
let input;
if (mode === 'create') {
  const selected = controller.getState().record.games[1].children[0].children[1];
  assert(controller.goTo(selected.id).ok);
  assert(controller.setComment('Authored unfinished 한국어 中文 日本語').ok);
  assert(controller.setMarker({ x: 2, y: 2 }, 'label', 'A').ok);
  assert(controller.setConnection({ x: 1, y: 1 }, { x: 3, y: 3 }, 'arrow').ok);
  assert(
    controller.addStroke([
      { x: 1.5, y: 2 },
      { x: 3, y: 4 },
    ]).ok,
  );
  assert(controller.next().ok);
  assert(controller.next().ok);
  input = controller.createCheckpoint();
} else {
  let text = '';
  for await (const chunk of process.stdin) text += chunk;
  input = JSON.parse(text);
  assert(controller.loadCheckpoint(input, { discardChanges: true }).ok);
}
const checkpoint = controller.createCheckpoint();
assert.deepEqual(checkpoint, input);
assert(parseRecordCheckpoint(checkpoint).ok);
assert.equal(checkpoint.selection.gameIndex, 1);
assert.deepEqual(checkpoint.selection.path, [0, 1, 0, 0]);
assert.equal(checkpoint.rules.ko, 'situational-superko');
assert.equal(checkpoint.rules.passStones, true);
assert.notEqual(checkpoint.sgf, checkpoint.baselineSgf);
assert(checkpoint.sgf.includes('XX[keep]'));
const state = controller.getState();
assert(state.dirty);
assert.equal(state.position.consecutivePasses, 2);
assert.equal(state.position.moveNumber, 44);
assert.equal(state.position.board[70], 'black');
assert.equal(state.position.board[80], 'white');
const branch = state.record.games[1].children[0].children[1];
assert.equal(branch.properties.C[0], 'Authored unfinished 한국어 中文 日本語');
assert(branch.properties.LB && branch.properties.AR && branch.properties.BPN);
assert.equal(state.record.games[1].children[0].children.length, 2);
const automation = executeAutomation({
  schemaVersion: 'banora.automation/v1',
  kind: 'record',
  checkpoint,
  includeCheckpoint: true,
});
assert(automation.ok);
assert.deepEqual(automation.checkpoint, checkpoint);
assert(automation.history.dirty && !automation.history.canUndo && !automation.history.canRedo);
const before = controller.getState(),
  bytesBefore = JSON.stringify(checkpoint);
const rejected = controller.loadCheckpoint(
  { ...checkpoint, schemaVersion: 'banora.checkpoint/v99' },
  { discardChanges: true },
);
assert.equal(rejected.ok, false);
assert.equal(rejected.reason, 'invalid-checkpoint');
assert.equal(controller.getState(), before);
assert.equal(JSON.stringify(checkpoint), bytesBefore);
const reopened = new RecordController({ sgf: checkpoint.sgf, rules: checkpoint.rules });
assert.equal(serializeSgf(reopened.getState().record), checkpoint.sgf);
assert.equal(reopened.getState().record.games.length, 2);
const baseline = new RecordController({ sgf: checkpoint.baselineSgf, rules: checkpoint.rules });
assert(!baseline.getState().dirty);
assert(
  controller.loadCheckpoint(
    { ...checkpoint, sgf: checkpoint.baselineSgf },
    { discardChanges: true },
  ).ok,
);
assert(!controller.getState().dirty);
assert(!controller.getState().canUndo && !controller.getState().canRedo);
controller.dispose();
reopened.dispose();
baseline.dispose();
process.stdout.write(
  JSON.stringify({
    ok: true,
    checkpoint,
    state: {
      snapshot: automation.snapshot,
      selection: automation.selection,
      rules: automation.rules,
      passPrisoners: automation.passPrisoners,
      consecutivePasses: automation.consecutivePasses,
      properties: automation.selected.properties,
      sgf: automation.sgf,
      dirty: automation.history.dirty,
    },
  }) + '\n',
);
