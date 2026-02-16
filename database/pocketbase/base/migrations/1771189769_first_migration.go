package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
	"github.com/pocketbase/pocketbase/tools/types"
)

func init() {
	m.Register(func(app core.App) error {
		// Create categories collection
		categoriesCollection := core.NewBaseCollection("categories")
		categoriesCollection.ListRule = types.Pointer("")
		categoriesCollection.ViewRule = types.Pointer("")
		categoriesCollection.CreateRule = nil
		categoriesCollection.UpdateRule = nil
		categoriesCollection.DeleteRule = nil

		categoriesCollection.Fields.Add(
			&core.TextField{
				Name:     "name",
				Required: false,
				Max:      0,
			},
			&core.TextField{
				Name:     "display_name",
				Required: false,
				Max:      0,
			},
			&core.NumberField{
				Name:     "display_order",
				Required: false,
				Min:      types.Pointer(0.0),
			},
		)

		if err := app.Save(categoriesCollection); err != nil {
			return err
		}

		// Create nouns collection
		nounsCollection := core.NewBaseCollection("nouns")
		nounsCollection.ListRule = types.Pointer("")
		nounsCollection.ViewRule = types.Pointer("")
		nounsCollection.CreateRule = nil
		nounsCollection.UpdateRule = nil
		nounsCollection.DeleteRule = nil

		nounsCollection.Fields.Add(
			&core.TextField{
				Name:     "german",
				Required: true,
			},
			&core.SelectField{
				Name:      "article",
				Required:  true,
				MaxSelect: 1,
				Values:    []string{"der", "die", "das"},
			},
			&core.TextField{
				Name:     "plural",
				Required: false,
			},
			&core.TextField{
				Name:     "english",
				Required: false,
			},
			&core.SelectField{
				Name:      "level",
				Required:  true,
				MaxSelect: 1,
				Values:    []string{"A1", "A2", "B1", "B2", "C1", "C2"},
			},
			&core.RelationField{
				Name:          "category",
				Required:      true,
				MaxSelect:     1,
				MinSelect:     0,
				CollectionId:  categoriesCollection.Id,
				CascadeDelete: false,
			},
		)

		// Add unique index on (german, article)
		nounsCollection.AddIndex("idx_nouns_german_article", true, "german, article", "")

		if err := app.Save(nounsCollection); err != nil {
			return err
		}

		// Update users collection API rules (collection already exists from auth)
		usersCollection, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}

		usersCollection.ListRule = types.Pointer("id = @request.auth.id")
		usersCollection.ViewRule = types.Pointer("id = @request.auth.id")
		usersCollection.CreateRule = nil
		usersCollection.UpdateRule = types.Pointer("id = @request.auth.id")
		usersCollection.DeleteRule = types.Pointer("id = @request.auth.id")

		if err := app.Save(usersCollection); err != nil {
			return err
		}

		return nil
	}, func(app core.App) error {
		// Rollback: delete collections in reverse order
		nounsCollection, err := app.FindCollectionByNameOrId("nouns")
		if err == nil {
			if err := app.Delete(nounsCollection); err != nil {
				return err
			}
		}

		categoriesCollection, err := app.FindCollectionByNameOrId("categories")
		if err == nil {
			if err := app.Delete(categoriesCollection); err != nil {
				return err
			}
		}

		// Reset users collection API rules
		usersCollection, err := app.FindCollectionByNameOrId("users")
		if err == nil {
			usersCollection.ListRule = nil
			usersCollection.ViewRule = nil
			usersCollection.CreateRule = nil
			usersCollection.UpdateRule = nil
			usersCollection.DeleteRule = nil
			if err := app.Save(usersCollection); err != nil {
				return err
			}
		}

		return nil
	})
}
