package migrations

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
)

// resetPasswordTemplate replaces PocketBase's default reset email. The default
// links to the admin dashboard (/_/#/auth/confirm-password-reset/...), which is
// built for superusers, so app users would have nowhere to set a new password.
// This points at the page served from base/pb_public/reset-password.html.
//
// The token goes in the URL fragment (#), which browsers never send to the
// server, so it can't end up in access logs. {APP_URL} is the "Application URL"
// in the admin Settings and must be the public server URL.
var resetPasswordTemplate = core.EmailTemplate{
	Subject: "Reset your Üben password",
	Body: `<p>Hello,</p>
<p>We received a request to reset the password of your Üben cloud backup account.</p>
<p>Open the link below to choose a new password. It works for 30 minutes.</p>
<p>
  <a class="btn" href="` + core.EmailPlaceholderAppURL + `/reset-password.html#` + core.EmailPlaceholderToken + `" target="_blank" rel="noopener">Reset password</a>
</p>
<p><i>If you didn't ask for this, you can ignore this email. Your password stays the same.</i></p>
<p>
  Thanks,<br/>
  Üben
</p>`,
}

func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		users.ResetPasswordTemplate = resetPasswordTemplate
		return app.Save(users)
	}, func(app core.App) error {
		// Back to PocketBase's built-in template.
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		fresh := core.NewAuthCollection("tmp")
		users.ResetPasswordTemplate = fresh.ResetPasswordTemplate
		return app.Save(users)
	})
}
