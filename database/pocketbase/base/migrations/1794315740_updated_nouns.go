package migrations

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_678144923")
		if err != nil {
			return err
		}

		// update field
		if err := collection.Fields.AddMarshaledJSONAt(7, []byte(`{
			"help": "",
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
				"Daf Kompakt",
				"Klett Kontext"
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
			"help": "",
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
	})
}
