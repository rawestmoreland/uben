package main

import (
	"time"

	"ganigeorgiev.com/pocketbase/dbx"
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"
)

// Cloud backup accounts that nobody has used for this long are deleted, along
// with their backup (the backups.user relation cascades). This is the storage
// limitation promised in the privacy policy (marketing/public/privacy.*): if
// you change it, change the policy and the in-app notice (app.backup.privacy_notice)
// in every locale.
const (
	inactiveAccountDays = 730 // 24 months
	// A run deletes at most this many accounts, so a mistake can't wipe the table.
	retentionBatchLimit = 200
	// last_active is only rewritten when older than this, to keep writes cheap.
	lastActiveRefresh = 24 * time.Hour
)

// registerAccountRetention records account activity and schedules the daily
// purge. "Activity" is any authenticated use of the account: signing in or
// refreshing a token, and uploading, reading or listing the backup. Uploads
// and reads matter because the app talks to the server with a long-lived token
// and does not sign in again, so a sign-in-only signal would purge active users.
func registerAccountRetention(app core.App) {
	app.OnRecordAuthRequest("users").BindFunc(func(e *core.RecordAuthRequestEvent) error {
		touchLastActive(e.App, e.Record.Id, time.Now())
		return e.Next()
	})

	touchAuth := func(e *core.RequestEvent) {
		if e.Auth != nil && e.Auth.Collection().Name == "users" {
			touchLastActive(e.App, e.Auth.Id, time.Now())
		}
	}
	app.OnRecordsListRequest("backups").BindFunc(func(e *core.RecordsListRequestEvent) error {
		touchAuth(e.RequestEvent)
		return e.Next()
	})
	app.OnRecordViewRequest("backups").BindFunc(func(e *core.RecordRequestEvent) error {
		touchAuth(e.RequestEvent)
		return e.Next()
	})
	app.OnRecordCreateRequest("backups").BindFunc(func(e *core.RecordRequestEvent) error {
		touchAuth(e.RequestEvent)
		return e.Next()
	})
	app.OnRecordUpdateRequest("backups").BindFunc(func(e *core.RecordRequestEvent) error {
		touchAuth(e.RequestEvent)
		return e.Next()
	})

	app.Cron().MustAdd("purgeInactiveAccounts", "17 3 * * *", func() {
		purgeInactiveAccounts(app, time.Now())
	})
}

// touchLastActive sets users.last_active to now unless it was set recently.
// It writes with plain SQL so it doesn't fire record hooks or bump `updated`.
func touchLastActive(app core.App, userID string, now time.Time) {
	_, err := app.DB().
		NewQuery("UPDATE users SET last_active = {:now} WHERE id = {:id} AND (last_active = '' OR last_active IS NULL OR last_active < {:stale})").
		Bind(dbx.Params{
			"now":   dateTimeString(now),
			"id":    userID,
			"stale": dateTimeString(now.Add(-lastActiveRefresh)),
		}).
		Execute()
	if err != nil {
		app.Logger().Warn("could not update last_active", "error", err)
	}
}

// purgeInactiveAccounts deletes accounts with no activity since the cutoff and
// returns how many it removed. Accounts that never got a last_active (should
// not happen after the migration) fall back to their creation date.
func purgeInactiveAccounts(app core.App, now time.Time) int {
	cutoff := dateTimeString(now.AddDate(0, 0, -inactiveAccountDays))

	stale, err := app.FindRecordsByFilter(
		"users",
		"(last_active != '' && last_active < {:cutoff}) || (last_active = '' && created < {:cutoff})",
		"last_active",
		retentionBatchLimit,
		0,
		dbx.Params{"cutoff": cutoff},
	)
	if err != nil {
		app.Logger().Error("inactive account lookup failed", "error", err)
		return 0
	}

	deleted := 0
	for _, user := range stale {
		if err := app.Delete(user); err != nil {
			app.Logger().Error("could not delete inactive account", "id", user.Id, "error", err)
			continue
		}
		deleted++
	}
	if deleted > 0 {
		app.Logger().Info("deleted inactive cloud backup accounts", "count", deleted)
	}
	return deleted
}

// dateTimeString formats a time the way PocketBase stores date fields, so
// string comparison in SQL orders correctly.
func dateTimeString(t time.Time) string {
	parsed, _ := types.ParseDateTime(t)
	return parsed.String()
}
