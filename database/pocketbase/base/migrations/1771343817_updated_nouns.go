package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_678144923")
		if err != nil {
			return err
		}

		// update field
		if err := collection.Fields.AddMarshaledJSONAt(7, []byte(`{
			"hidden": false,
			"id": "select1542800728",
			"maxSelect": 2,
			"name": "sources",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "select",
			"values": [
				"Schritte Plus Neu",
				"Goethe",
				"Nicos Weg",
				"Daf Kompakt"
			]
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_678144923")
		if err != nil {
			return err
		}

		// update field
		if err := collection.Fields.AddMarshaledJSONAt(7, []byte(`{
			"hidden": false,
			"id": "select1542800728",
			"maxSelect": 2,
			"name": "field",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "select",
			"values": [
				"Schritte Plus Neu",
				"Goethe",
				"Nicos Weg",
				"Daf Kompakt"
			]
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	})
}
