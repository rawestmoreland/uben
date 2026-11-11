import { getActiveSale, isWithinSaleWindow } from '../saleService';

const WINDOW = {
  startsAt: '2026-12-18T12:00:00Z',
  endsAt: '2027-01-03T12:00:00Z',
};

describe('isWithinSaleWindow', () => {
  it('is false before the sale starts', () => {
    expect(
      isWithinSaleWindow(WINDOW, new Date('2026-12-18T11:59:59Z')),
    ).toBe(false);
  });

  it('is true from the start instant (inclusive)', () => {
    expect(
      isWithinSaleWindow(WINDOW, new Date('2026-12-18T12:00:00Z')),
    ).toBe(true);
  });

  it('is true in the middle of the sale', () => {
    expect(
      isWithinSaleWindow(WINDOW, new Date('2026-12-25T09:00:00Z')),
    ).toBe(true);
  });

  it('is false at the end instant (exclusive)', () => {
    expect(
      isWithinSaleWindow(WINDOW, new Date('2027-01-03T12:00:00Z')),
    ).toBe(false);
  });

  it('is false for a malformed window instead of showing forever', () => {
    expect(
      isWithinSaleWindow(
        { startsAt: 'not a date', endsAt: WINDOW.endsAt },
        new Date('2026-12-25T09:00:00Z'),
      ),
    ).toBe(false);
  });
});

describe('getActiveSale', () => {
  it('returns the end date during the sale on iOS and Android', () => {
    const now = new Date('2026-12-25T09:00:00Z');
    for (const platform of ['ios', 'android']) {
      const sale = getActiveSale(platform, now);
      expect(sale).not.toBeNull();
      expect(sale?.endsAt).toBeInstanceOf(Date);
    }
  });

  it('returns null outside the sale', () => {
    expect(getActiveSale('ios', new Date('2026-11-11T00:00:00Z'))).toBeNull();
    expect(
      getActiveSale('android', new Date('2027-02-01T00:00:00Z')),
    ).toBeNull();
  });

  it('returns null on web', () => {
    expect(getActiveSale('web', new Date('2026-12-25T09:00:00Z'))).toBeNull();
  });
});
