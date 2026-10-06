package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		// promo_codes holds admin-uploaded codes that unlock Üben Pro.
		//
		// All API rules are nil (admin only): codes can't be listed or
		// enumerated through the public API. Redemption goes through the
		// custom POST /api/promo/redeem route (see promo.go), which is the
		// only way an app install touches this collection.
		//
		// Anonymity: only a redemption count is stored — never who redeemed.
		promoCodes := core.NewBaseCollection("promo_codes")
		promoCodes.ListRule = nil
		promoCodes.ViewRule = nil
		promoCodes.CreateRule = nil
		promoCodes.UpdateRule = nil
		promoCodes.DeleteRule = nil

		promoCodes.Fields.Add(
			// Stored uppercase and trimmed (the redeem route normalizes
			// input the same way).
			&core.TextField{Name: "code", Required: true, Max: 64},
			// Empty/0 means unlimited.
			&core.NumberField{Name: "max_uses", Required: false},
			&core.NumberField{Name: "use_count", Required: false},
			// Empty means never expires.
			&core.DateField{Name: "expires_at", Required: false},
			&core.BoolField{Name: "active"},
			// Admin-only note, e.g. "School X, Spring 2027". Never shown to users.
			&core.TextField{Name: "note", Required: false},
			&core.AutodateField{Name: "created", OnCreate: true},
			&core.AutodateField{Name: "updated", OnCreate: true, OnUpdate: true},
		)

		promoCodes.AddIndex("idx_promo_codes_code", true, "code", "")

		return app.Save(promoCodes)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("promo_codes")
		if err != nil {
			return err
		}
		return app.Delete(collection)
	})
}
