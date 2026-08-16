import { describe, expect, it } from 'vitest';
import { localizedContentString } from '../src/content/localization/catalogs';
import { davelBarkRequest } from '../src/runtime/davel-barks';
import { ROBOT_DEFINITIONS } from '../src/sim/robots';

describe('localized deterministic Davel barks', () => {
  it('selects stable archetype lines without random or authoritative state', () => {
    const first = davelBarkRequest(0, 0, 'telegraph');
    expect(first).toEqual({
      speakerKey: 'davels.wobble_scout', lineKey: 'barks.wobble_scout.telegraph_2',
    });
    expect(davelBarkRequest(0, 0, 'telegraph')).toEqual(first);
    expect(localizedContentString('en', first!.lineKey)).not.toBe(first!.lineKey);
    expect(localizedContentString('ar', first!.lineKey)).not.toBe(first!.lineKey);
  });

  it('gives every stable Davel a localized speaker and phase-specific boss lines', () => {
    for (const [robotId, definition] of ROBOT_DEFINITIONS.entries()) {
      const request = davelBarkRequest(robotId, 123, 'defeated');
      expect(request, definition.name).not.toBeNull();
      expect(localizedContentString('en', request!.speakerKey)).not.toBe(request!.speakerKey);
      expect(localizedContentString('ar', request!.speakerKey)).not.toBe(request!.speakerKey);
    }
    expect(davelBarkRequest(6, 500, 'boss-phase', 2)?.lineKey).toBe('barks.invoice_overlord.phase_2');
    expect(davelBarkRequest(999, 0, 'telegraph')).toBeNull();
  });
});
