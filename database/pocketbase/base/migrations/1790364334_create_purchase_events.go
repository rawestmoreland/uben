package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		// purchase_events stores one record per Üben Pro purchase-funnel step
		// (paywall shown, purchase attempted/succeeded/cancelled/failed, restore
		// attempted/succeeded/failed), so conversion can be measured.
		//
		// Anonymity design — same contract as quiz_results:
		//   - No user ID, session ID, device ID, or location.
		//   - Only the funnel step and, optionally, what screen sent the user to
		//     the paywall. Like any HTTP request the server access log will
		//     contain the caller's IP address, but that is NOT stored here and
		//     is not retained beyond normal log rotation.
		//
		// Access rules:
		//   - Create requires the same shared app key as quiz_results (matches
		//     EXPO_PUBLIC_PB_API_KEY) — any app install can submit.
		//   - List/View/Update/Delete = nil (admin only) — raw records are
		//     never exposed publicly; only aggregated reports are shared.
		purchaseEventsCollection := core.NewBaseCollection("purchase_events")
		purchaseEventsCollection.CreateRule = types.Pointer(`@request.query.key="0LEA3wy4uPfnZ3prfk8cWLmV55oDvyC4dRWVxNMRTmY="`)
		purchaseEventsCollection.ListRule = nil   // admin only
		purchaseEventsCollection.ViewRule = nil   // admin only
		purchaseEventsCollection.UpdateRule = nil // admin only
		purchaseEventsCollection.DeleteRule = nil // admin only

		purchaseEventsCollection.Fields.Add(
			// event: the funnel step this record represents.
			&core.SelectField{
				Name:      "event",
				Required:  true,
				MaxSelect: 1,
				Values: []string{
					"paywall_viewed",
					"purchase_attempted",
					"purchase_succeeded",
					"purchase_cancelled",
					"purchase_failed",
					"restore_attempted",
					"restore_succeeded",
					"restore_failed",
				},
			},
			// source: which surface sent the user to the paywall (e.g.
			// "adjective_quiz", "level_selector", "add_word"). Optional and
			// free-form — never a user or device identifier.
			&core.TextField{
				Name:     "source",
				Required: false,
				Max:      64,
			},
			&core.AutodateField{
				Name:     "created",
				OnCreate: true,
			},
			&core.AutodateField{
				Name:     "updated",
				OnCreate: true,
				OnUpdate: true,
			},
		)

		// Index on event so funnel aggregation queries are fast.
		purchaseEventsCollection.AddIndex("idx_purchase_events_event", false, "event", "")

		return app.Save(purchaseEventsCollection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("purchase_events")
		if err != nil {
			return err
		}
		return app.Delete(collection)
	})
}
