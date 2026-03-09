package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		nounsCollection, err := app.FindCollectionByNameOrId("nouns")
		if err != nil {
			return err
		}

		// quiz_results stores one record per quiz answer.
		//
		// Anonymity design:
		//   - No user ID, session ID, device ID, or location.
		//   - Only the noun being quizzed, whether the answer was correct,
		//     a quality score (0–5), and response time in milliseconds.
		//   - Like any HTTP request the server access log will contain the
		//     caller's IP address, but that data is NOT stored in this
		//     collection and is not retained beyond normal log rotation.
		//
		// Access rules:
		//   - Create = "" (public, no auth) — any app user can submit.
		//   - List/View/Update/Delete = nil (admin only) — raw records are
		//     never exposed publicly; only aggregated reports are shared.
		quizResultsCollection := core.NewBaseCollection("quiz_results")
		quizResultsCollection.CreateRule = types.Pointer("") // anonymous create
		quizResultsCollection.ListRule = nil                 // admin only
		quizResultsCollection.ViewRule = nil                 // admin only
		quizResultsCollection.UpdateRule = nil               // admin only
		quizResultsCollection.DeleteRule = nil               // admin only

		quizResultsCollection.Fields.Add(
			// noun_id links the result to a noun so we can aggregate by word.
			// Required so results without a known noun are rejected.
			&core.RelationField{
				Name:          "noun_id",
				Required:      true,
				MaxSelect:     1,
				MinSelect:     0,
				CollectionId:  nounsCollection.Id,
				CascadeDelete: true, // clean up if the noun is ever removed
			},
			// is_correct: true when the user picked the right article.
			&core.BoolField{
				Name:     "is_correct",
				Required: true,
			},
			// quality: SM-2 quality score (0 = total blank, 5 = perfect fast).
			// Stored for richer analytics beyond just correct/incorrect.
			&core.NumberField{
				Name:     "quality",
				Required: true,
				Min:      types.Pointer(0.0),
				Max:      types.Pointer(5.0),
			},
			// time_taken_ms: how long the user took to answer, in milliseconds.
			// Optional — older clients may not send this.
			&core.NumberField{
				Name:     "time_taken_ms",
				Required: false,
				Min:      types.Pointer(0.0),
			},
		)

		// Index on noun_id so aggregate queries ("hardest words") are fast.
		quizResultsCollection.AddIndex("idx_quiz_results_noun", false, "noun_id", "")

		return app.Save(quizResultsCollection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("quiz_results")
		if err != nil {
			return err
		}
		return app.Delete(collection)
	})
}
