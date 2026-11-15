package migrations

import (
	"ganigeorgiev.com/pocketbase/pocketbase/core"
	m "ganigeorgiev.com/pocketbase/pocketbase/migrations"
)

// resetPasswordTemplateV2 gives the reset email the app's neo-brutalist look:
// yellow brand bar, thick black borders, hard offset shadow, chunky yellow
// button.
//
// Email clients (Outlook's Word engine, Gmail, Apple Mail, Yahoo...) support
// only a small slice of CSS, so this uses ONLY what works everywhere:
//   - table layout (no flexbox, grid, float or positioning)
//   - inline styles and bgcolor attributes (PocketBase's own <style> block is
//     not relied on, and its .btn class is deliberately not used)
//   - solid colours as hex (no rgba, gradients, CSS variables or images)
//   - borders on <td> instead of box-shadow (the "hard shadow" is a thicker
//     black right/bottom border on a wrapper cell) and no border-radius
//   - web-safe font stack, px sizes, no @media queries (the card is fluid:
//     width 100% capped at 480px, with a width hint for Outlook via an MSO
//     conditional comment, since Outlook ignores max-width)
//   - the button is a bordered, padded <td> around the link, because Outlook
//     ignores padding on <a>
//
// PocketBase wraps this fragment in its own layout (white page, 20px/30px body
// padding), so the card sits on white, not the app's cream. A test in
// account_retention_test.go fails if a CSS feature that isn't safe in email
// is added.
//
// The link is {APP_URL}/reset-password.html#{TOKEN}; it appears twice so there
// is a plain-text fallback for clients that block buttons.
const resetEmailFont = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`

var resetPasswordTemplateV2 = core.EmailTemplate{
	Subject: "Reset your Üben password",
	Body: `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#ffffff;">Choose a new password for your Üben cloud backup account.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:0;">
      <!--[if mso]><table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:480px;">
        <tr>
          <td style="padding:0;border-right:6px solid #000000;border-bottom:6px solid #000000;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border-collapse:collapse;border:3px solid #000000;background-color:#ffffff;">
              <tr>
                <td bgcolor="#ffe500" style="padding:18px 24px;background-color:#ffe500;border-bottom:3px solid #000000;font-family:` + resetEmailFont + `;font-size:32px;line-height:36px;font-weight:bold;color:#000000;">Üben</td>
              </tr>
              <tr>
                <td style="padding:24px;font-family:` + resetEmailFont + `;font-size:16px;line-height:24px;color:#000000;">
                  <p style="margin:0 0 16px 0;font-family:` + resetEmailFont + `;font-size:24px;line-height:30px;font-weight:bold;color:#000000;">Reset your password</p>
                  <p style="margin:0 0 8px 0;font-family:` + resetEmailFont + `;font-size:16px;line-height:24px;color:#000000;">We received a request to reset the password of your Üben cloud backup account.</p>
                  <p style="margin:0 0 24px 0;font-family:` + resetEmailFont + `;font-size:16px;line-height:24px;color:#000000;">Use the button below to choose a new password. The link works for 30 minutes.</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 24px 0;">
                    <tr>
                      <td style="padding:0;border-right:4px solid #000000;border-bottom:4px solid #000000;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                          <tr>
                            <td align="center" bgcolor="#ffe500" style="padding:16px 28px;background-color:#ffe500;border:3px solid #000000;">
                              <a href="{APP_URL}/reset-password.html#{TOKEN}" target="_blank" rel="noopener" style="font-family:` + resetEmailFont + `;font-size:16px;line-height:20px;font-weight:bold;color:#000000;text-decoration:none;letter-spacing:0.5px;">RESET PASSWORD</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0 0 4px 0;font-family:` + resetEmailFont + `;font-size:14px;line-height:20px;color:#333333;">Button not working? Copy this link into your browser:</p>
                  <p style="margin:0 0 24px 0;font-family:` + resetEmailFont + `;font-size:14px;line-height:20px;color:#0066ff;word-break:break-all;"><a href="{APP_URL}/reset-password.html#{TOKEN}" target="_blank" rel="noopener" style="color:#0066ff;text-decoration:underline;">{APP_URL}/reset-password.html#{TOKEN}</a></p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                    <tr>
                      <td bgcolor="#fff8e1" style="padding:12px 16px;background-color:#fff8e1;border:2px solid #000000;font-family:` + resetEmailFont + `;font-size:14px;line-height:20px;color:#000000;">If you didn't ask for this, you can ignore this email. Your password stays the same.</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>`,
}

func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		users.ResetPasswordTemplate = resetPasswordTemplateV2
		return app.Save(users)
	}, func(app core.App) error {
		// Back to the plain template from 1794500200.
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}
		users.ResetPasswordTemplate = resetPasswordTemplate
		return app.Save(users)
	})
}
