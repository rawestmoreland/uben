import { runMigrations, migrations } from '../migrations';

// ── Mock db factory ───────────────────────────────────────────────────────────

function makeMockDb() {
  return {
    execAsync: jest.fn().mockResolvedValue(undefined),
    getFirstAsync: jest.fn().mockResolvedValue(null), // default: migration not yet applied
    runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('runMigrations()', () => {
  let mockDb: ReturnType<typeof makeMockDb>;

  beforeEach(() => {
    mockDb = makeMockDb();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates the migrations tracking table on first call', async () => {
    await runMigrations(mockDb as any);

    const createTableCall = mockDb.execAsync.mock.calls.find(([sql]: [string]) =>
      sql.includes('CREATE TABLE IF NOT EXISTS migrations'),
    );
    expect(createTableCall).toBeDefined();
  });

  it('checks each migration version against the tracking table', async () => {
    await runMigrations(mockDb as any);

    for (const migration of migrations) {
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT 1 FROM migrations WHERE version = ?'),
        [migration.version],
      );
    }
  });

  it('applies all migrations when none have been applied yet', async () => {
    // getFirstAsync returns null for every check → all migrations are unapplied
    mockDb.getFirstAsync.mockResolvedValue(null);

    await runMigrations(mockDb as any);

    // Verify each migration version was recorded
    for (const migration of migrations) {
      expect(mockDb.runAsync).toHaveBeenCalledWith(
        'INSERT INTO migrations (version) VALUES (?)',
        [migration.version],
      );
    }
  });

  it('records each migration in the tracking table after applying it', async () => {
    await runMigrations(mockDb as any);

    const insertCalls = mockDb.runAsync.mock.calls.filter(
      ([sql]: [string]) =>
        sql === 'INSERT INTO migrations (version) VALUES (?)',
    );

    expect(insertCalls).toHaveLength(migrations.length);
    migrations.forEach((migration, index) => {
      expect(insertCalls[index][1]).toEqual([migration.version]);
    });
  });

  it('skips migrations that are already recorded', async () => {
    // All migrations appear to be already applied
    mockDb.getFirstAsync.mockResolvedValue({ '1': 1 });

    await runMigrations(mockDb as any);

    const insertCalls = mockDb.runAsync.mock.calls.filter(
      ([sql]: [string]) =>
        sql === 'INSERT INTO migrations (version) VALUES (?)',
    );
    expect(insertCalls).toHaveLength(0);
  });

  it('applies only unapplied migrations in a partial state', async () => {
    // Migration 001 already applied; 002, 003, and 004 not yet applied
    mockDb.getFirstAsync
      .mockResolvedValueOnce({ '1': 1 }) // 001 → applied
      .mockResolvedValueOnce(null) // 002 → unapplied
      .mockResolvedValueOnce(null) // 003 → unapplied
      .mockResolvedValueOnce(null); // 004 → unapplied

    await runMigrations(mockDb as any);

    const insertCalls = mockDb.runAsync.mock.calls.filter(
      ([sql]: [string]) =>
        sql === 'INSERT INTO migrations (version) VALUES (?)',
    );

    expect(insertCalls).toHaveLength(3);
    expect(insertCalls[0][1]).toEqual(['002']);
    expect(insertCalls[1][1]).toEqual(['003']);
    expect(insertCalls[2][1]).toEqual(['004']);
  });

  it('calls each migration up() with the db object', async () => {
    const upSpies = migrations.map((m) => jest.spyOn(m, 'up'));

    await runMigrations(mockDb as any);

    for (const spy of upSpies) {
      expect(spy).toHaveBeenCalledWith(mockDb);
    }

    upSpies.forEach((spy) => spy.mockRestore());
  });
});
