import { expect, test } from 'bun:test';
import { SUPPORTED_LOCALES } from '@0disoft/banora/locale';
import {
  authorMessages,
  englishAuthorMessages,
} from '../examples/studio/puzzle-author-language.js';
import { puzzleDraftErrors } from '../examples/studio/puzzle-draft.js';
import { translateUi } from '../examples/ui-language.js';

test('all twelve authoring catalogs cover every field, action and safe validation error', () => {
  expect(Object.keys(authorMessages).sort()).toEqual([...SUPPORTED_LOCALES].sort());
  for (const locale of SUPPORTED_LOCALES) {
    const messages = authorMessages[locale];
    expect(Object.keys(messages).sort()).toEqual(Object.keys(englishAuthorMessages).sort());
    for (const value of Object.values(messages))
      expect(typeof value === 'string' && value.trim().length > 0).toBe(true);
    expect(translateUi('Create puzzle', locale)).toBe(messages.create);
    if (locale !== 'en') expect(messages.create).not.toBe(englishAuthorMessages.create);
  }
  for (const [code, message] of Object.entries(puzzleDraftErrors))
    expect(englishAuthorMessages[code as keyof typeof puzzleDraftErrors]).toBe(message);
});
