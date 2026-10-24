import type { ControllerFailure } from './controller.js';

/** English fallback stays independent of optional locale catalogs. */
export const boardNotices = Object.freeze({
  placementCancelled: 'Placement cancelled.',
  viewportChanged: 'Placement cancelled: viewport changed.',
  pinnedUnavailable: 'Pinned node is unavailable.',
  nodeUnavailable: 'Node unavailable',
  moveRejected: 'Move rejected: {reason}',
  strokeLimit: 'Stroke cancelled: more than {limit} sampled points. Draw shorter strokes.',
  inkAdded: 'Ink stroke added. Undo removes it.',
  inkRejected: 'Ink rejected: {reason}',
  placementCaptureUnavailable: 'Placement cancelled: pointer capture is unavailable.',
  inkCaptureUnavailable: 'Ink cancelled: pointer capture is unavailable.',
  aimConfirm: '{coordinate} selected. Drag to aim; release then confirm.',
  aimRelease: '{coordinate} selected. Drag to aim; release to place.',
  outsideBoard: 'Outside board. Release to cancel.',
  confirmHint:
    '{coordinate} selected. Confirm placement or cancel. Enter confirms; Escape cancels.',
  placementReleaseInside: 'Placement cancelled: release inside the board.',
  inkReleaseInside: 'Ink cancelled: release inside the board.',
  inkCancelled: 'Ink cancelled.',
  pendingCancelled: 'Pending input cancelled.',
  inkStarted: 'Ink started. Move the cursor and add points with Space; Enter finishes.',
  difference: '{coordinate}: {before} to {after}',
});
export type BoardNotices = { readonly [Key in keyof typeof boardNotices]: string };
export const boardFailureLabelKeys = Object.freeze({
  occupied: 'failureOccupied',
  'out-of-bounds': 'failureOutOfBounds',
  'wrong-turn': 'failureWrongTurn',
  suicide: 'failureSuicide',
  ko: 'failureKo',
  superko: 'failureSuperko',
  'invalid-setup': 'failureSetup',
  'unsaved-changes': 'failureUnsaved',
  'node-not-found': 'failureNode',
  'no-history': 'failureHistory',
  'invalid-annotation': 'failureAnnotation',
  'invalid-edit': 'failureEdit',
  import: 'failureImport',
  'invalid-export': 'failureExport',
  'invalid-checkpoint': 'failureCheckpoint',
  'stale-preview': 'failurePreview',
  limit: 'failureLimit',
} as const satisfies Record<ControllerFailure, string>);
export type BoardFailureLabels = {
  readonly [Key in (typeof boardFailureLabelKeys)[ControllerFailure]]: string;
};
