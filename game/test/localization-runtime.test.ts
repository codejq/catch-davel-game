import { describe, expect, it } from 'vitest';
import { localizedContentString, releaseLocalizationCatalog } from '../src/content/localization/catalogs';
import { runtimeUiText } from '../src/content/localization/runtime-ui';

describe('runtime localization selection', () => {
  it('selects English/Arabic direction and safely falls back to English', () => {
    expect(releaseLocalizationCatalog('ar')).toMatchObject({ locale: 'ar', direction: 'rtl' });
    expect(releaseLocalizationCatalog('en')).toMatchObject({ locale: 'en', direction: 'ltr' });
    expect(releaseLocalizationCatalog('unsupported')).toMatchObject({ locale: 'en', direction: 'ltr' });
    expect(localizedContentString('ar', 'levels.001.name')).toBe('التمايل الأول');
    expect(localizedContentString('en', 'barks.red_firemouth.telegraph_1')).toContain('Hot delivery');
    expect(localizedContentString('ar', 'barks.red_firemouth.telegraph_1')).toContain('توصيل ساخن');
    expect(localizedContentString('unsupported', 'levels.001.name')).toBe('First Wobble');
    expect(localizedContentString('ar', 'missing.key')).toBe('missing.key');
  });

  it('localizes runtime UI templates and replaces bounded parameters', () => {
    expect(runtimeUiText('ar', 'remain', { count: 8 })).toBe('متبقٍ 8 من دافل');
    expect(runtimeUiText('ar', 'upgradePrice', { name: 'شحن النبضة', level: '1 → 2', cost: 10 }))
      .toBe('شحن النبضة · المستوى 1 → 2 · 10 عملة');
    expect(runtimeUiText('ar', 'retryCheckpoint')).toBe('إعادة نقطة الحفظ');
    expect(runtimeUiText('en', 'restartMissionHint')).toContain('Restart the mission');
    expect(runtimeUiText('ar', 'renderQuality')).toBe('جودة العرض');
    expect(runtimeUiText('en', 'checkpointBanked', { coins: 9 })).toContain('+9 COINS BANKED');
    expect(runtimeUiText('ar', 'pauseHint')).toContain('القذائف');
    expect(runtimeUiText('en', 'compassAria', { target: 'WORKSHOP KEY', distance: 22 }))
      .toBe('WORKSHOP KEY, 22 meters away');
    expect(runtimeUiText('ar', 'compassDistance', { distance: 22 })).toBe('على بعد 22 م');
    expect(runtimeUiText('ar', 'waveIncoming', { wave: 2, waves: 2 })).toBe('الموجة 2 / 2 قادمة');
    expect(runtimeUiText('unsupported', 'campaignButton')).toBe('M · LEVELS');
  });
});
