export type Schema = Readonly<Record<string, unknown>>;
export function freezeSchema<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freezeSchema(child);
    Object.freeze(value);
  }
  return value;
}

export function matches(value: unknown, schema: Schema): boolean {
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
      (schema.minLength === undefined || value.length >= (schema.minLength as number)) &&
      (schema.pattern === undefined || new RegExp(schema.pattern as string).test(value))
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
      (schema.minItems === undefined || value.length >= (schema.minItems as number)) &&
      (schema.uniqueItems !== true || new Set(value).size === value.length) &&
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
