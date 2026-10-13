import type { BanoraLocale } from '@0disoft/banora/locale';
import { koreanUi, koreanPatterns } from './ui-korean.js';
import { chineseUi, chinesePatterns } from './ui-chinese.js';
import { japaneseUi, japanesePatterns } from './ui-japanese.js';
import { hiUi, hiPatterns } from './locales/hi.js';
import { esUi, esPatterns } from './locales/es.js';
import { frUi, frPatterns } from './locales/fr.js';
import { ruUi, ruPatterns } from './locales/ru.js';
import { idUi, idPatterns } from './locales/id.js';
import { viUi, viPatterns } from './locales/vi.js';
import { thUi, thPatterns } from './locales/th.js';
import { msUi, msPatterns } from './locales/ms.js';
import type { UiPatterns } from './ui-pattern-types.js';

export type StudioUiCatalog = Readonly<Record<keyof typeof koreanUi, string>>;
export const uiCatalogs: Readonly<Record<BanoraLocale, StudioUiCatalog>> = {
  en: Object.fromEntries(Object.keys(koreanUi).map((key) => [key, key])) as StudioUiCatalog,
  ko: koreanUi,
  zh: chineseUi,
  ja: japaneseUi,
  hi: hiUi,
  es: esUi,
  fr: frUi,
  ru: ruUi,
  id: idUi,
  vi: viUi,
  th: thUi,
  ms: msUi,
};
export const uiPatterns: Readonly<Record<Exclude<BanoraLocale, 'en'>, UiPatterns>> = {
  ko: koreanPatterns,
  zh: chinesePatterns,
  ja: japanesePatterns,
  hi: hiPatterns,
  es: esPatterns,
  fr: frPatterns,
  ru: ruPatterns,
  id: idPatterns,
  vi: viPatterns,
  th: thPatterns,
  ms: msPatterns,
};
