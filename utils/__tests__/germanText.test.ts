import { convertEszettToSS, applyGermanTextPreference } from '../germanText';

describe('germanText utilities', () => {
  describe('convertEszettToSS', () => {
    it('converts lowercase eszett to ss', () => {
      expect(convertEszettToSS('Straße')).toBe('Strasse');
      expect(convertEszettToSS('Großmutter')).toBe('Grossmutter');
      expect(convertEszettToSS('Fuß')).toBe('Fuss');
      expect(convertEszettToSS('Spaß')).toBe('Spass');
    });

    it('converts uppercase eszett to SS', () => {
      expect(convertEszettToSS('GROẞMUTTER')).toBe('GROSSMUTTER');
    });

    it('leaves text without eszett unchanged', () => {
      expect(convertEszettToSS('Hund')).toBe('Hund');
      expect(convertEszettToSS('Katze')).toBe('Katze');
    });

    it('handles multiple eszett characters', () => {
      expect(convertEszettToSS('Straßenbaß')).toBe('Strassenb ass');
    });
  });

  describe('applyGermanTextPreference', () => {
    it('returns original text when preference is eszett', () => {
      expect(applyGermanTextPreference('Straße', 'eszett')).toBe('Straße');
      expect(applyGermanTextPreference('Großmutter', 'eszett')).toBe(
        'Großmutter',
      );
    });

    it('converts to ss when preference is ss', () => {
      expect(applyGermanTextPreference('Straße', 'ss')).toBe('Strasse');
      expect(applyGermanTextPreference('Großmutter', 'ss')).toBe(
        'Grossmutter',
      );
    });
  });
});
