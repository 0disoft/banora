import { RULE_PROFILES } from './rules.js';
import { DEFAULT_SGF_LIMITS } from './sgf.js';

type Schema = Readonly<Record<string, unknown>>;
const text = (maxLength = 65_536): Schema => ({ type: 'string', maxLength });
const integer = (minimum = 0, maximum = 52): Schema => ({ type: 'integer', minimum, maximum });
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
const point = object({ x: integer(0, 51), y: integer(0, 51) });
const fractionalPoint = object({
  x: { type: 'number', minimum: 0, maximum: 51 },
  y: { type: 'number', minimum: 0, maximum: 51 },
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
  marker: object(
    {
      point,
      kind: choice(['triangle', 'square', 'circle', 'cross', 'label', null]),
      label: text(1024),
    },
    ['point', 'kind'],
  ),
  setup: object(
    {
      stones: list(
        object({ x: integer(0, 51), y: integer(0, 51), color: choice(['black', 'white', null]) }),
        2704,
      ),
      toPlay: color,
    },
    ['stones'],
  ),
  connection: object(
    { from: point, to: point, kind: choice(['line', 'arrow']), present: { type: 'boolean' } },
    ['from', 'to', 'kind'],
  ),
  stroke: object({ points: list(fractionalPoint, 512), ...style }, ['points']),
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
      deadStones: list(point, 2704),
      sekiStones: list(point, 2704),
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
    key: { ...text(512), minLength: 1 },
    width: integer(2, 52),
    height: integer(2, 52),
    stones: list(choice(['black', 'white', null]), 2704),
    toPlay: color,
    moveNumber: integer(0, Number.MAX_SAFE_INTEGER),
    captures: object({
      black: integer(0, Number.MAX_SAFE_INTEGER),
      white: integer(0, Number.MAX_SAFE_INTEGER),
    }),
    lastMove: { anyOf: [point, { type: 'null' }] },
    numbers: list(object({ point, value: integer(0, Number.MAX_SAFE_INTEGER) }), 2704),
    markers: list(
      object(
        {
          point,
          kind: choice(['triangle', 'square', 'circle', 'cross', 'label']),
          label: text(1024),
        },
        ['point', 'kind'],
      ),
      4096,
    ),
    connections: list(object({ from: point, to: point, kind: choice(['line', 'arrow']) }), 4096),
    strokes: list(object({ id: text(64), points: list(fractionalPoint, 512), ...style }), 64),
    visiblePoints: { anyOf: [list(point, 2704), { type: 'null' }] },
    dimPoints: list(point, 2704),
    overlays: list(
      object(
        {
          kind: choice(['heatmap', 'badge', 'ring']),
          point,
          color: text(7),
          opacity: { type: 'number', minimum: 0, maximum: 1 },
          label: text(64),
          textColor: text(7),
          ariaLabel: text(512),
        },
        ['kind', 'point', 'color'],
      ),
      8192,
    ),
  },
  ['key', 'width', 'height', 'stones'],
);
function freezeSchema<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeSchema(child);
    Object.freeze(value);
  }
  return value;
}

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
        size: integer(2, 52),
        profile,
        stateKey: text(512),
        selection: locator,
        operations: list({ anyOf: operations }, 256),
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

function matches(value: unknown, schema: Schema): boolean {
  if (schema.const !== undefined && value !== schema.const) return false;
  if (schema.enum && !(schema.enum as unknown[]).includes(value)) return false;
  if (schema.anyOf && !(schema.anyOf as Schema[]).some((item) => matches(value, item)))
    return false;
  if (schema.type === 'null') return value === null;
  if (schema.type === 'boolean') return typeof value === 'boolean';
  if (schema.type === 'string')
    return (
      typeof value === 'string' &&
      value.length <= (schema.maxLength as number) &&
      (schema.minLength === undefined || value.length >= (schema.minLength as number))
    );
  if (schema.type === 'number' || schema.type === 'integer')
    return (
      typeof value === 'number' &&
      Number.isFinite(value) &&
      (schema.type !== 'integer' || Number.isInteger(value)) &&
      (schema.minimum === undefined || value >= (schema.minimum as number)) &&
      (schema.maximum === undefined || value <= (schema.maximum as number))
    );
  if (schema.type === 'array')
    return (
      Array.isArray(value) &&
      value.length <= (schema.maxItems as number) &&
      Array.from(value).every((item) => matches(item, schema.items as Schema))
    );
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const data = value as Record<string, unknown>,
      fields = schema.properties as Record<string, Schema> | undefined;
    if ((schema.required as string[]).some((key) => !Object.hasOwn(data, key))) return false;
    return (
      !fields ||
      Object.entries(data).every(([key, item]) =>
        Object.hasOwn(fields, key)
          ? matches(item, fields[key]!)
          : schema.additionalProperties !== false,
      )
    );
  }
  return true;
}
export function isAutomationRequest(value: unknown): boolean {
  return AUTOMATION_SCHEMA.oneOf.filter((schema) => matches(value, schema)).length === 1;
}
