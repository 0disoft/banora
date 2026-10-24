/** Shared literal message policy; never retain or mutate caller-owned overrides. */
export function resolveWidgetMessages<Messages extends Readonly<Record<string, string>>>(
  defaults: Messages,
  overrides: unknown,
): Messages {
  const result = { ...defaults };
  if (overrides !== undefined) {
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides))
      throw TypeError('Widget messages must be an object');
    for (const [key, value] of Object.entries(overrides)) {
      if (!Object.hasOwn(defaults, key) || typeof value !== 'string' || value.length > 4096)
        throw TypeError('Invalid widget message');
      (result as Record<string, string>)[key] = value;
    }
  }
  return Object.freeze(result);
}
