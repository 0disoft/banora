export const SUPPORTED_LOCALES = Object.freeze([
  'en',
  'zh',
  'hi',
  'es',
  'fr',
  'ru',
  'id',
  'ja',
  'vi',
  'ko',
  'th',
  'ms',
] as const);
export type BanoraLocale = (typeof SUPPORTED_LOCALES)[number];
