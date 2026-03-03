package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("nouns")
		if err != nil {
			return err
		}

		// Add sense field — optional disambiguation hint for homographs
		// e.g. "See" → sense="lake" for der See, sense="sea" for die See
		// e.g. "Bank" → sense="bench" for one die Bank, sense="financial" for another
		collection.Fields.Add(&core.TextField{
			Name:     "sense",
			Required: false,
		})

		// Update the unique index to include sense so same-article homographs
		// (e.g. two "die Bank" entries with different senses) are allowed.
		// The existing idx_nouns_german_article index must be replaced.
		collection.RemoveIndex("idx_nouns_german_article")
		collection.AddIndex("idx_nouns_german_article_sense", true, "german, article, COALESCE(sense, '')", "")

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("nouns")
		if err != nil {
			return err
		}

		collection.Fields.RemoveById("sense")

		// Restore original unique index on (german, article)
		collection.RemoveIndex("idx_nouns_german_article_sense")
		collection.AddIndex("idx_nouns_german_article", true, "german, article", "")

		return app.Save(collection)
	})
}
