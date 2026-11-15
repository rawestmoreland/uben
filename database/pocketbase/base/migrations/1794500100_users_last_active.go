package migrations

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
	"ganigeorgiev.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		// users.last_active drives the automatic deletion of inactive cloud
		// backup accounts (see account_retention.go). Only the server writes it:
		// the rules below refuse it in any client request, otherwise someone
		// could register with a far-future date and never be purged.
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}

		users.Fields.Add(&core.DateField{Name: "last_active"})
		users.CreateRule = types.Pointer(`@request.query.key="` + cloudBackupAppKey + `" && @request.body.last_active:isset = false`)
		users.UpdateRule = types.Pointer(`id = @request.auth.id && @request.body.verified:isset = false && @request.body.last_active:isset = false`)
		if err := app.Save(users); err != nil {
			return err
		}

		// Existing accounts get a full retention period from now.
		_, err = app.DB().
			NewQuery("UPDATE users SET last_active = {:now} WHERE last_active = '' OR last_active IS NULL").
			Bind(map[string]any{"now": types.NowDateTime().String()}).
			Execute()
		return err
	}, func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		users.Fields.RemoveByName("last_active")
		users.CreateRule = types.Pointer(`@request.query.key="` + cloudBackupAppKey + `"`)
		users.UpdateRule = types.Pointer(`id = @request.auth.id && @request.body.verified:isset = false`)
		return app.Save(users)
	})
}
