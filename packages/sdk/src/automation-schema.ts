import { RULE_PROFILES } from './rules.js';
import { DEFAULT_SGF_LIMITS } from './sgf.js';

import { freezeSchema, matches } from './json-schema.js';
import type { Schema } from './json-schema.js';
import { CHECKPOINT_SCHEMA } from './checkpoint.js';
import { AUTOMATION_LIMITS } from './automation-limits.js';
import { MAX_BOARD_SIDE, MIN_BOARD_SIDE } from './board-dimensions.js';
import { strokeLimits } from './annotations.js';
import {
  boardConnectionKinds,
  boardMarkerKinds,
  boardOverlayKinds,
  boardSnapshotLimits,
} from './board-snapshot-contract.js';
const maxBoardArea = MAX_BOARD_SIDE ** 2;
const maxCoordinate = MAX_BOARD_SIDE - 1;
const text = (maxLength = 65_536): Schema => ({ type: 'string', maxLength });
const integer = (minimum = 0, maximum = MAX_BOARD_SIDE): Schema => ({
  type: 'integer',
  minimum,
  maximum,
});
const list = (items: Schema, maxItems: number): Schema => ({ type: 'array', items, maxItems });
const object = (
  properties: Record<string, Schema>,
  required = Object.keys(properties),
): Schema => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
const choice = (values: readonly unknown[]): Schema => ({ enum: values });
const color = choice(['black', 'white']);
const point = object({ x: integer(0, maxCoordinate), y: integer(0, maxCoordinate) });
const fractionalPoint = object({
  x: { type: 'number', minimum: 0, maximum: maxCoordinate },
  y: { type: 'number', minimum: 0, maximum: maxCoordinate },
});
// Linear move paths are bounded by total nodes, not nested SGF variation depth.
const locator = object({
  gameIndex: integer(0, 49_999),
  path: list(integer(0, 49_999), DEFAULT_SGF_LIMITS.maxNodes - 1),
});
const profile = choice(Object.keys(RULE_PROFILES));
const style = { color: text(7), width: { type: 'number', minimum: 0.02, maximum: 0.5 } };
const definitions: Record<string, Schema> = {
  play: object({ point: { anyOf: [point, { type: 'null' }] } }),
  previous: object({}),
  next: object({ variation: integer(0, 49_999) }, []),
  goto: object({ target: locator }),
  comment: object({ text: text() }),
  'move-assessment': object({ value: choice(['good', 'bad', null]), target: locator }, ['value']),
  search: object(
    {
      query: text(512),
      properties: {
        ...list({ ...text(8), minLength: 1, pattern: '^[A-Z]{1,8}$' }, 32),
        minItems: 1,
        uniqueItems: true,
      },
      caseSensitive: { type: 'boolean' },
      gameIndex: integer(0, 49_999),
      offset: integer(0, 50_000),
      limit: integer(1, 100),
    },
    ['query'],
  ),
  'comment-batch': object(
    {
      changes: list(
        object({ target: locator, text: text(), expectedText: text() }, ['target', 'text']),
        256,
      ),
      previewOnly: { type: 'boolean' },
      expectedSgf: text(5 * 1024 * 1024),
    },
    ['changes'],
  ),
  marker: object(
    {
      point,
      kind: choice([...boardMarkerKinds, null]),
      label: text(boardSnapshotLimits.markerLabel),
    },
    ['point', 'kind'],
  ),
  setup: object(
    {
      stones: list(
        object({
          x: integer(0, maxCoordinate),
          y: integer(0, maxCoordinate),
          color: choice(['black', 'white', null]),
        }),
        maxBoardArea,
      ),
      toPlay: color,
    },
    ['stones'],
  ),
  connection: object(
    { from: point, to: point, kind: choice(boardConnectionKinds), present: { type: 'boolean' } },
    ['from', 'to', 'kind'],
  ),
  stroke: object({ points: list(fractionalPoint, strokeLimits.pointsPerStroke), ...style }, [
    'points',
  ]),
  'remove-stroke': object({ id: text(128) }),
  'clear-strokes': object({}),
  'remove-branch': object({ target: locator }, []),
  'reorder-branch': object({ target: locator, index: integer(0, 49_999) }),
  undo: object({}),
  redo: object({}),
  'legal-points': object({}),
  score: object(
    {
      profile,
      komi: { type: 'number' },
      handicap: integer(0, 1_000_000_000),
      deadStones: list(point, maxBoardArea),
      sekiStones: list(point, maxBoardArea),
      adjustments: object({ black: { type: 'number' }, white: { type: 'number' } }, []),
    },
    ['profile'],
  ),
};
const operations = Object.entries(definitions).map(([op, schema]) => ({
  ...schema,
  properties: { op: { const: op }, ...(schema.properties as Record<string, Schema>) },
  required: ['op', ...(schema.required as string[])],
}));
const snapshotSchema = object(
  {
    key: { ...text(boardSnapshotLimits.key), minLength: 1 },
    width: integer(MIN_BOARD_SIDE, MAX_BOARD_SIDE),
    height: integer(MIN_BOARD_SIDE, MAX_BOARD_SIDE),
    stones: list(choice(['black', 'white', null]), maxBoardArea),
    toPlay: color,
    moveNumber: integer(0, Number.MAX_SAFE_INTEGER),
    captures: object({
      black: integer(0, Number.MAX_SAFE_INTEGER),
      white: integer(0, Number.MAX_SAFE_INTEGER),
    }),
    lastMove: { anyOf: [point, { type: 'null' }] },
    numbers: list(object({ point, value: integer(0, Number.MAX_SAFE_INTEGER) }), maxBoardArea),
    markers: list(
      object(
        {
          point,
          kind: choice(boardMarkerKinds),
          label: text(boardSnapshotLimits.markerLabel),
        },
        ['point', 'kind'],
      ),
      boardSnapshotLimits.markers,
    ),
    connections: list(
      object({ from: point, to: point, kind: choice(boardConnectionKinds) }),
      boardSnapshotLimits.connections,
    ),
    strokes: list(
      object({
        id: text(64),
        points: list(fractionalPoint, strokeLimits.pointsPerStroke),
        ...style,
      }),
      strokeLimits.strokes,
    ),
    visiblePoints: { anyOf: [list(point, maxBoardArea), { type: 'null' }] },
    dimPoints: list(point, maxBoardArea),
    overlays: list(
      object(
        {
          kind: choice(boardOverlayKinds),
          point,
          color: text(7),
          opacity: { type: 'number', minimum: 0, maximum: 1 },
          label: text(boardSnapshotLimits.overlayLabel),
          textColor: text(7),
          ariaLabel: text(boardSnapshotLimits.overlayDescription),
        },
        ['kind', 'point', 'color'],
      ),
      boardSnapshotLimits.overlays,
    ),
  },
  ['key', 'width', 'height', 'stones'],
);
/** JSON Schema for discovery; snapshot geometry/annotations are additionally checked by createBoardSnapshot. */
export const AUTOMATION_SCHEMA = freezeSchema({
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Banora terminal automation request',
  oneOf: [
    object(
      {
        schemaVersion: { const: 'banora.automation/v1' },
        kind: { const: 'record' },
        sgf: text(5 * 1024 * 1024),
        checkpoint: CHECKPOINT_SCHEMA,
        includeCheckpoint: { type: 'boolean' },
        size: integer(2, 52),
        profile,
        stateKey: text(512),
        selection: locator,
        operations: list({ anyOf: operations }, AUTOMATION_LIMITS.operations),
        includeTree: { type: 'boolean' },
      },
      ['schemaVersion', 'kind'],
    ),
    object(
      {
        schemaVersion: { const: 'banora.automation/v1' },
        kind: { const: 'snapshot' },
        state: snapshotSchema,
      },
      ['schemaVersion', 'kind', 'state'],
    ),
  ],
} as const);

export function isAutomationRequest(value: unknown): boolean {
  return AUTOMATION_SCHEMA.oneOf.filter((schema) => matches(value, schema)).length === 1;
}
