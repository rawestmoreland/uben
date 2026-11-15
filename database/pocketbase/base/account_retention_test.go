package main

import (
	"testing"
	"time"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
)

// newMigratedApp bootstraps an empty PocketBase app and applies the real
// migrations, so the test runs against the production schema and rules.
func newMigratedApp(t *testing.T) core.App {
	t.Helper()
	app := core.NewBaseApp(core.BaseAppConfig{DataDir: t.TempDir()})
	if err := app.Bootstrap(); err != nil {
		t.Fatalf("bootstrap: %v", err)
	}
	t.Cleanup(func() { _ = app.ResetBootstrapState() })
	if _, err := core.NewMigrationsRunner(app, core.AppMigrations).Up(); err != nil {
		t.Fatalf("migrations: %v", err)
	}
	return app
}

func createUser(t *testing.T, app core.App, email string) *core.Record {
	t.Helper()
	users, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		t.Fatal(err)
	}
	user := core.NewRecord(users)
	user.SetEmail(email)
	user.SetPassword("password123")
	if err := app.Save(user); err != nil {
		t.Fatalf("create user: %v", err)
	}
	return user
}

func createBackup(t *testing.T, app core.App, userID string) {
	t.Helper()
	backups, err := app.FindCollectionByNameOrId("backups")
	if err != nil {
		t.Fatal(err)
	}
	backup := core.NewRecord(backups)
	backup.Set("user", userID)
	backup.Set("payload", map[string]any{"version": 1})
	backup.Set("payload_version", 1)
	if err := app.Save(backup); err != nil {
		t.Fatalf("create backup: %v", err)
	}
}

// setLastActive writes last_active directly, the way only the server can.
func setLastActive(t *testing.T, app core.App, userID string, at time.Time) {
	t.Helper()
	_, err := app.DB().
		NewQuery("UPDATE users SET last_active = {:at} WHERE id = {:id}").
		Bind(map[string]any{"at": dateTimeString(at), "id": userID}).
		Execute()
	if err != nil {
		t.Fatal(err)
	}
}

func userExists(app core.App, id string) bool {
	_, err := app.FindRecordById("users", id)
	return err == nil
}

func backupCount(t *testing.T, app core.App) int {
	t.Helper()
	records, err := app.FindAllRecords("backups")
	if err != nil {
		t.Fatal(err)
	}
	return len(records)
}

func TestPurgeInactiveAccounts(t *testing.T) {
	app := newMigratedApp(t)
	now := time.Now()
	day := 24 * time.Hour

	stale := createUser(t, app, "stale@test.dev")
	justUnder := createUser(t, app, "under@test.dev")
	recent := createUser(t, app, "recent@test.dev")
	createBackup(t, app, stale.Id)
	createBackup(t, app, justUnder.Id)
	createBackup(t, app, recent.Id)
	setLastActive(t, app, stale.Id, now.Add(-(inactiveAccountDays+1)*day))
	setLastActive(t, app, justUnder.Id, now.Add(-(inactiveAccountDays-1)*day))
	setLastActive(t, app, recent.Id, now.Add(-day))

	if got := purgeInactiveAccounts(app, now); got != 1 {
		t.Fatalf("deleted %d accounts, want 1", got)
	}
	if userExists(app, stale.Id) {
		t.Error("inactive account was not deleted")
	}
	if !userExists(app, justUnder.Id) || !userExists(app, recent.Id) {
		t.Error("an active account was deleted")
	}
	// The inactive account's backup goes with it; the others stay.
	if got := backupCount(t, app); got != 2 {
		t.Errorf("%d backups left, want 2 (cascade delete)", got)
	}
}

func TestPurgeFallsBackToCreatedWhenNeverActive(t *testing.T) {
	app := newMigratedApp(t)
	user := createUser(t, app, "never@test.dev")
	_, err := app.DB().NewQuery("UPDATE users SET last_active = '' WHERE id = {:id}").
		Bind(map[string]any{"id": user.Id}).Execute()
	if err != nil {
		t.Fatal(err)
	}

	// Created just now: kept. Judged from a point past the retention period: deleted.
	if got := purgeInactiveAccounts(app, time.Now()); got != 0 {
		t.Fatalf("deleted %d, want 0 for a brand-new account", got)
	}
	future := time.Now().AddDate(0, 0, inactiveAccountDays+2)
	if got := purgeInactiveAccounts(app, future); got != 1 {
		t.Fatalf("deleted %d, want 1 once past the retention period", got)
	}
}

func TestPurgeDeletesEveryStaleAccountFound(t *testing.T) {
	app := newMigratedApp(t)
	old := time.Now().AddDate(0, 0, -(inactiveAccountDays + 10))
	for i := 0; i < 3; i++ {
		user := createUser(t, app, "old"+string(rune('a'+i))+"@test.dev")
		setLastActive(t, app, user.Id, old)
	}
	if got := purgeInactiveAccounts(app, time.Now()); got != 3 {
		t.Fatalf("deleted %d, want 3", got)
	}
}

func TestTouchLastActiveOnlyWritesWhenStale(t *testing.T) {
	app := newMigratedApp(t)
	user := createUser(t, app, "touch@test.dev")
	now := time.Now()

	setLastActive(t, app, user.Id, now.Add(-3*24*time.Hour))
	touchLastActive(app, user.Id, now)
	refreshed, _ := app.FindRecordById("users", user.Id)
	if got := refreshed.GetDateTime("last_active").Time(); now.Sub(got) > time.Minute {
		t.Errorf("stale last_active was not refreshed: %v", got)
	}

	// A recent value is left alone (no write per request).
	recentAt := now.Add(-time.Hour)
	setLastActive(t, app, user.Id, recentAt)
	touchLastActive(app, user.Id, now)
	untouched, _ := app.FindRecordById("users", user.Id)
	if got := untouched.GetDateTime("last_active").Time(); got.Sub(recentAt).Abs() > time.Second {
		t.Errorf("recent last_active was rewritten: %v", got)
	}
}

func TestNewAccountIsNotPurged(t *testing.T) {
	app := newMigratedApp(t)
	user := createUser(t, app, "new@test.dev")
	// last_active starts empty on create, so retention falls back to `created`.
	if got := purgeInactiveAccounts(app, time.Now()); got != 0 {
		t.Fatalf("a new account was purged (%d)", got)
	}
	if !userExists(app, user.Id) {
		t.Fatal("new account missing")
	}
}
