jest.mock('@/constants/i18n', () => ({
  __esModule: true,
  default: { language: 'en' },
}));

import { upperCaseForLanguage } from '../uiText';

describe('upperCaseForLanguage', () => {
  it('maps dotted and dotless i for Turkish', () => {
    expect(upperCaseForLanguage('istatistik', 'tr')).toBe('İSTATİSTİK');
    expect(upperCaseForLanguage('ışık', 'tr')).toBe('IŞIK');
    expect(upperCaseForLanguage('Kelime çalış', 'tr')).toBe('KELİME ÇALIŞ');
  });

  it('accepts regional Turkish tags', () => {
    expect(upperCaseForLanguage('ilerleme', 'tr-TR')).toBe('İLERLEME');
  });

  it('keeps ordinary casing for other languages', () => {
    expect(upperCaseForLanguage('practice', 'en')).toBe('PRACTICE');
    expect(upperCaseForLanguage('die', 'fr')).toBe('DIE');
    expect(upperCaseForLanguage('Straße', 'pl')).toBe('STRASSE');
  });
});
