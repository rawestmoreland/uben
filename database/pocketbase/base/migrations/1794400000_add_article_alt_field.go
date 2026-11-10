package migrations

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("nouns")
		if err != nil {
			return err
		}

		// Add article_alt — optional second article for the SAME meaning,
		// e.g. der/die Gleichgesinnte (article="der", article_alt="die").
		// `article` stays the primary article, so the (german, article, sense)
		// unique index and the deterministic remote IDs are untouched.
		// Different-meaning pairs (der See / die See) stay separate records.
		collection.Fields.Add(&core.SelectField{
			Name:      "article_alt",
			Required:  false,
			MaxSelect: 1,
			Values:    []string{"der", "die", "das"},
		})

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("nouns")
		if err != nil {
			return err
		}

		collection.Fields.RemoveByName("article_alt")

		return app.Save(collection)
	})
}
