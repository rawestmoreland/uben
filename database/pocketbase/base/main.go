package main

import (
	"log"
	"os"
	"strings"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"

	_ "uben/migrations"
)

func main() {
	app := pocketbase.New()

	// loosely check if it was executed using "go run"
	// go run compiles to a temp directory, check multiple possible patterns
	execPath := os.Args[0]
	isGoRun := strings.HasPrefix(execPath, os.TempDir()) ||
		strings.Contains(execPath, "go-build") ||
		strings.Contains(execPath, "/tmp/") ||
		strings.Contains(execPath, "/var/folders/")

	log.Println("isGoRun", isGoRun, "execPath:", execPath)

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: isGoRun,
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		// serves static files from the provided public dir (if exists)
		se.Router.GET("/{path...}", apis.Static(os.DirFS("./pb_public"), false))

		return se.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
