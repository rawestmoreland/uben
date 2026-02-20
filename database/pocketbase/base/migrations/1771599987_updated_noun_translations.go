package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_810347691")
		if err != nil {
			return err
		}

		// update field
		if err := collection.Fields.AddMarshaledJSONAt(2, []byte(`{
			"hidden": false,
			"id": "select1098958488",
			"maxSelect": 1,
			"name": "locale",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "select",
			"values": [
				"en",
				"it",
				"pl"
			]
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_810347691")
		if err != nil {
			return err
		}

		// update field
		if err := collection.Fields.AddMarshaledJSONAt(2, []byte(`{
			"hidden": false,
			"id": "select1098958488",
			"maxSelect": 1,
			"name": "locale",
			"presentable": false,
			"required": false,
			"system": false,
			"type": "select",
			"values": [
				"en",
				"it"
			]
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	})
}
