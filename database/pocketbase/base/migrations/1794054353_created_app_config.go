package migrations

import (
	"encoding/json/v2"

	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		jsonData := `{
			"createRule": null,
			"deleteRule": null,
			"fields": [
				{
					"autogeneratePattern": "[a-z0-9]{15}",
					"help": "",
					"hidden": false,
					"id": "text3208210256",
					"max": 15,
					"min": 15,
					"name": "id",
					"pattern": "^[a-z0-9]+$",
					"presentable": false,
					"primaryKey": true,
					"required": true,
					"system": true,
					"type": "text"
				},
				{
					"help": "",
					"hidden": false,
					"id": "select961728715",
					"maxSelect": 1,
					"name": "platform",
					"presentable": false,
					"required": true,
					"system": false,
					"type": "select",
					"values": [
						"ios",
						"android"
					]
				},
				{
					"autogeneratePattern": "",
					"help": "",
					"hidden": false,
					"id": "text3162416508",
					"max": 0,
					"min": 0,
					"name": "latest_version",
					"pattern": "^\\d+\\.\\d+\\.\\d+$",
					"presentable": false,
					"primaryKey": false,
					"required": true,
					"system": false,
					"type": "text"
				},
				{
					"autogeneratePattern": "",
					"help": "Should always be at or below latest_version",
					"hidden": false,
					"id": "text3890410120",
					"max": 0,
					"min": 0,
					"name": "min_version",
					"pattern": "^\\d+\\.\\d+\\.\\d+$",
					"presentable": false,
					"primaryKey": false,
					"required": false,
					"system": false,
					"type": "text"
				},
				{
					"autogeneratePattern": "",
					"help": "",
					"hidden": false,
					"id": "text4121075559",
					"max": 0,
					"min": 0,
					"name": "store_url",
					"pattern": "",
					"presentable": false,
					"primaryKey": false,
					"required": true,
					"system": false,
					"type": "text"
				},
				{
					"autogeneratePattern": "",
					"help": "",
					"hidden": false,
					"id": "text3065852031",
					"max": 0,
					"min": 0,
					"name": "message",
					"pattern": "",
					"presentable": false,
					"primaryKey": false,
					"required": false,
					"system": false,
					"type": "text"
				},
				{
					"hidden": false,
					"id": "autodate2990389176",
					"name": "created",
					"onCreate": true,
					"onUpdate": false,
					"presentable": false,
					"system": false,
					"type": "autodate"
				},
				{
					"hidden": false,
					"id": "autodate3332085495",
					"name": "updated",
					"onCreate": true,
					"onUpdate": true,
					"presentable": false,
					"system": false,
					"type": "autodate"
				}
			],
			"id": "pbc_3476648556",
			"indexes": [
				"CREATE UNIQUE INDEX ` + "`" + `idx_pibuz8zoac` + "`" + ` ON ` + "`" + `app_config` + "`" + ` (` + "`" + `platform` + "`" + `)"
			],
			"listRule": "",
			"name": "app_config",
			"system": false,
			"type": "base",
			"updateRule": null,
			"viewRule": ""
		}`

		collection := &core.Collection{}
		if err := json.Unmarshal([]byte(jsonData), &collection); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_3476648556")
		if err != nil {
			return err
		}

		return app.Delete(collection)
	})
}
