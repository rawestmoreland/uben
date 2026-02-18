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

		// Add translation_key field — not required, no unique constraint
		collection.Fields.Add(&core.TextField{
			Name:     "translation_key",
			Required: false,
		})

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("nouns")
		if err != nil {
			return err
		}

		collection.Fields.RemoveById("translation_key")

		return app.Save(collection)
	})
}
