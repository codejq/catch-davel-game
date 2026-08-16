import { describe, expect, it } from 'vitest';
import { localizedContentString, releaseLocalizationCatalog } from '../src/content/localization/catalogs';

describe('runtime localization selection', () => {
  it('selects English/Arabic direction and safely falls back to English', () => {
    expect(releaseLocalizationCatalog('ar')).toMatchObject({ locale: 'ar', direction: 'rtl' });
    expect(releaseLocalizationCatalog('en')).toMatchObject({ locale: 'en', direction: 'ltr' });
    expect(releaseLocalizationCatalog('unsupported')).toMatchObject({ locale: 'en', direction: 'ltr' });
    expect(localizedContentString('ar', 'levels.001.name')).toBe('التمايل الأول');
    expect(localizedContentString('unsupported', 'levels.001.name')).toBe('First Wobble');
    expect(localizedContentString('ar', 'missing.key')).toBe('missing.key');
  });
});
