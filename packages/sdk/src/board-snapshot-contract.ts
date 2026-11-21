export const boardSnapshotLimits = Object.freeze({
  key: 512,
  markers: 4096,
  markerLabel: 1024,
  connections: 4096,
  overlays: 8192,
  overlayLabel: 64,
  overlayDescription: 512,
});

export const boardMarkerKinds = Object.freeze([
  'triangle',
  'square',
  'circle',
  'cross',
  'label',
] as const);
export const boardConnectionKinds = Object.freeze(['line', 'arrow'] as const);
export const boardOverlayKinds = Object.freeze(['heatmap', 'badge', 'ring'] as const);
