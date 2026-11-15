package migrations

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"
)

// cloudBackupAppKey is the same shared app key used by quiz_results,
// purchase_events and the promo route (EXPO_PUBLIC_PB_API_KEY in the app).
const cloudBackupAppKey = "0LEA3wy4uPfnZ3prfk8cWLmV55oDvyC4dRWVxNMRTmY="

// cloudBackupRateRules are the rate-limit rules this migration owns. They only
// match the users collection, so the existing anonymous quiz_results and
// purchase_events writes are never throttled by them.
var cloudBackupRateRules = []core.RateLimitRule{
	{Label: "users:auth", MaxRequests: 10, Duration: 60},
	{Label: "users:create", MaxRequests: 5, Duration: 3600},
	{Label: "users:requestPasswordReset", MaxRequests: 5, Duration: 3600},
}

func init() {
	m.Register(func(app core.App) error {
		// ── users: optional accounts for Pro cloud backup ────────────────
		//
		// Registration was admin-only. It is now open to app installs (same
		// shared app key as the other write-enabled collections), so a user can
		// create an account from the backup screen. Everything else is still
		// "own record only".
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}

		users.CreateRule = types.Pointer(`@request.query.key="` + cloudBackupAppKey + `"`)
		// A user must never be able to flip verification or change another
		// record's data through their own update.
		users.UpdateRule = types.Pointer(`id = @request.auth.id && @request.body.verified:isset = false`)
		users.PasswordAuth.Enabled = true
		users.PasswordAuth.IdentityFields = []string{"email"}
		// Long-lived token (about 1 year): the app is offline-first, so a user
		// may not open the backup screen for months. The app also refreshes it.
		users.AuthToken.Duration = 60 * 60 * 24 * 365
		if err := app.Save(users); err != nil {
			return err
		}

		// ── backups: one row per user, owner-only ────────────────────────
		backups := core.NewBaseCollection("backups")
		ownerOnly := types.Pointer(`user = @request.auth.id`)
		backups.ListRule = ownerOnly
		backups.ViewRule = ownerOnly
		backups.CreateRule = types.Pointer(`@request.auth.id != "" && @request.body.user = @request.auth.id`)
		// `user` can never be reassigned to another account.
		backups.UpdateRule = types.Pointer(`user = @request.auth.id && @request.body.user:isset = false`)
		backups.DeleteRule = ownerOnly

		backups.Fields.Add(
			&core.RelationField{
				Name:          "user",
				Required:      true,
				MaxSelect:     1,
				CollectionId:  users.Id,
				CascadeDelete: true, // deleting the account deletes the backup
			},
			// payload: the portable progress snapshot (see
			// services/backupPayloadService.ts). Compact tuples keep a heavy
			// user's review history well under the limit; 8 MB is generous.
			&core.JSONField{
				Name:     "payload",
				Required: true,
				MaxSize:  8 * 1024 * 1024,
			},
			// payload_version lets restore refuse a payload newer than the app
			// understands without parsing it.
			&core.NumberField{
				Name:     "payload_version",
				Required: true,
				Min:      types.Pointer(1.0),
				OnlyInt:  true,
			},
			&core.TextField{Name: "app_version", Max: 32},
			&core.NumberField{Name: "card_count", Min: types.Pointer(0.0), OnlyInt: true},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)
		// Exactly one backup per user; the client upserts it.
		backups.AddIndex("idx_backups_user", true, "user", "")

		if err := app.Save(backups); err != nil {
			return err
		}

		// ── rate limits (users only; append, never clobber admin settings) ─
		settings := app.Settings()
		existing := map[string]bool{}
		for _, rule := range settings.RateLimits.Rules {
			existing[rule.Label] = true
		}
		for _, rule := range cloudBackupRateRules {
			if !existing[rule.Label] {
				settings.RateLimits.Rules = append(settings.RateLimits.Rules, rule)
			}
		}
		settings.RateLimits.Enabled = true
		return app.Save(settings)
	}, func(app core.App) error {
		if backups, err := app.FindCollectionByNameOrId("backups"); err == nil {
			if err := app.Delete(backups); err != nil {
				return err
			}
		}

		if users, err := app.FindCollectionByNameOrId("users"); err == nil {
			users.CreateRule = nil
			users.UpdateRule = types.Pointer("id = @request.auth.id")
			if err := app.Save(users); err != nil {
				return err
			}
		}

		settings := app.Settings()
		owned := map[string]bool{}
		for _, rule := range cloudBackupRateRules {
			owned[rule.Label] = true
		}
		kept := settings.RateLimits.Rules[:0]
		for _, rule := range settings.RateLimits.Rules {
			if !owned[rule.Label] {
				kept = append(kept, rule)
			}
		}
		settings.RateLimits.Rules = kept
		return app.Save(settings)
	})
}
