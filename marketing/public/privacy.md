# Privacy Policy for Üben

**Last Updated: November 15, 2026**

## Introduction

Westmoreland Creative, LLC ("we," "our," or "us") operates the Üben mobile application (the "App"). This Privacy Policy explains how we handle your information when you use our App.

**The short version: Your personal learning data stays on your device, unless you choose to turn on the optional Pro Cloud Backup, which needs an account. We also collect anonymous quiz analytics — no account, no name, no location attached.**

## Information Collection and Use

### What We DON'T Collect

Üben is designed with privacy as a core principle. We do not collect:

- Personal identification information (name, email, phone number, etc.), except the email address of the optional Cloud Backup account described below
- Device identifiers or advertising IDs ourselves (our advertising and purchase partners, described below, may process them)
- Location data
- Your individual learning progress or review history, unless you turn on Cloud Backup
- Any other information that can be used to identify you personally

### What Stays on Your Device

All of your personal learning data is stored locally on your device using SQLite:

- **Vocabulary data**: All German nouns, verbs, and vocabulary you add
- **Learning progress**: Your review history, spaced repetition intervals, and statistics
- **Settings**: Your app preferences and configurations
- **User-added content**: Any custom words you create

This data stays on your device unless you turn on Cloud Backup (see below).

### Anonymous Quiz Analytics

When you answer a quiz question on a pre-loaded vocabulary word, we send the following to our servers:

| Data point | Example | Why |
|---|---|---|
| Noun identifier | Internal ID of "der Hund" | To count results per word |
| Correct or incorrect | true / false | To measure difficulty |
| Quality score (0–5) | 4 | Richer difficulty signal |
| Response time | 1 342 ms | To distinguish confident vs. hesitant answers |

**What we do NOT send or store:**

- Your name, email, or any identifier
- Your device ID or installation ID
- Your location
- Your personal review history or streak
- Words you have added yourself (user-added words are never sent)

This data cannot be linked back to you. We use it in aggregate — for example, to identify which words learners find hardest or to publish anonymised statistics in blog posts.

### Cloud Backup (Üben Pro, optional)

Cloud Backup is a Pro feature that lets you restore your progress after reinstalling the App or on a new phone. It is off until you create an account in **Settings > Cloud backup**. If you never create one, none of this applies.

When you create an account and back up, we store:

| Data | Details |
|---|---|
| Email address | To identify your account and let you reset your password |
| Password | Stored only as a salted hash; we cannot read it |
| Learning progress | Spaced-repetition values and review history for each card |
| Words you added | The nouns, adjectives and verbs you created yourself |
| A few preferences | For example hint and level settings |
| Last activity date | The date you last signed in, backed up or restored, so we can delete inactive accounts |

**Unlike the anonymous quiz analytics, this data is linked to your account.** We use it only to provide the backup and restore feature. We do not use it for advertising, we do not sell it, and we do not combine it with the anonymous analytics. We do not receive your payment details or your RevenueCat identifier as part of the backup.

Backups are sent over HTTPS and stored on our server (PocketBase, hosted on Fly.io in the United States). They are readable only by your account and by our server administrators; they are not end-to-end encrypted. A sign-in token is kept on your device so you stay signed in.

You can delete your account and its backup at any time in **Settings > Cloud backup > Delete account**. Signing out does not delete the backup. Deleting the account deletes the backup with it, and does not change the progress on your device.

**Inactive accounts are deleted automatically.** If an account has no activity (no sign-in, backup or restore) for 2 years, we delete it and its backup. We don't send a warning first, so keep using the App, or back up again, if you want to keep your backup. Your progress on your device is never affected.

## Third-Party Services

### Our Analytics Backend

Anonymous quiz results are stored on our own server (PocketBase, hosted on Fly.io in the United States). Records contain only the data listed above. Raw records are accessible to administrators only; only aggregated summaries are ever shared publicly.

Like any HTTP request, your device's IP address appears in our server's access log. It is not stored in the quiz result record and is not associated with your answers. Access logs are retained for 30 days and then deleted automatically.

### Purchases (Üben Pro)

Üben Pro is a one-time in-app purchase. Payment is handled entirely by Apple (App Store) or Google (Google Play); we never see your payment details, name, or email address. To confirm that a purchase is valid and to let you restore it, we use RevenueCat, a purchase-management service. RevenueCat assigns your installation a random, anonymous app user ID and receives your purchase receipt and Pro entitlement status. We do not link this ID to your name or learning data.

Your Pro status is also cached on your device so Pro features keep working offline. RevenueCat's data practices are governed by their Privacy Policy: https://www.revenuecat.com/privacy

### Anonymous Purchase Analytics

To understand whether the Pro upgrade is clear and working, the App sends an anonymous event to our server when you view the upgrade screen or attempt, complete, cancel, or restore a purchase. Each event contains only the step (for example, "paywall viewed") and the part of the App that led you there (for example, "adjective quiz"), plus a timestamp. No user ID, device ID, or location is included.

### Promo Codes

If you enter a promo code, the code is sent to our server to check that it is valid and has not been used up. If it is accepted, Pro is unlocked on your device and the code is stored locally. Codes are not linked to you or your device.

### Advertising (AdMob)

Our App displays advertisements through Google AdMob. AdMob may collect certain information for the purpose of serving ads. This includes:

- Device information (device type, operating system)
- Ad interaction data
- Advertising identifiers (IDFA on iOS, AAID on Android)

AdMob's data collection is governed by Google's Privacy Policy: https://policies.google.com/privacy

You can opt out of personalized advertising through your device settings:

- **iOS**: Settings > Privacy > Tracking > Turn off "Allow Apps to Request to Track"
- **Android**: Settings > Google > Ads > Opt out of Ads Personalization

We do not have access to any data collected by AdMob.

Ads are shown in the free version. Purchasing Üben Pro removes ads.

### Expo Platform

Our App is built using Expo, a React Native framework. Expo may collect minimal technical information for crash reporting and app updates:

- App version information
- Device operating system version
- Crash logs (anonymous, no personal data)

Expo's privacy practices are governed by their Privacy Policy: https://expo.dev/privacy

## Data Storage and Security

- **On-device data**: Controlled entirely by you. Deleting the App removes all local data permanently.
- **Device backups**: Your local data may be included in device backups (iCloud, iTunes, etc.) per your device settings.
- **Analytics server**: Anonymous quiz records, purchase events, and promo code redemption counts are stored on Fly.io servers in the United States. Records contain no personal data.
- **Server access logs**: Retained for 30 days, then deleted. Not linked to quiz result records.
- **Cloud Backup (optional)**: Your account email, hashed password and backup are stored on Fly.io servers in the United States until you delete your account, or until it is deleted automatically after 2 years without activity.

## Children's Privacy

Our App does not knowingly collect any personal information from anyone, including children under 13. The anonymous analytics we collect contain no personally identifiable information. Cloud Backup accounts are not intended for children under 13, and we do not knowingly create accounts for them. The App is designed to be used by language learners of all ages.

## Data Sharing

We do not sell personal data. Apart from the optional Cloud Backup account described above, we do not collect personal data ourselves. Our service providers (Google AdMob, RevenueCat, Apple, and Google) process the limited data described above to provide ads and purchases. Aggregated, anonymised quiz statistics (e.g., "the ten hardest nouns for learners") may be published in blog posts or shown inside the App.

## Your Rights

Unless you use Cloud Backup, we do not collect personal data linked to you, so there is generally nothing to access, modify, or delete. You have complete control over your on-device data through:

- Deleting the App (removes all local data)
- Managing your device's storage
- Controlling your device's backup settings

If you use Cloud Backup, you can delete your account and backup yourself in the App (**Settings > Cloud backup > Delete account**), or email us to request a copy of your account data or its deletion.

EU residents may contact us at richard@westmorelandcreative.com with any GDPR-related questions.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by:

- Posting the new Privacy Policy in the App
- Updating the "Last Updated" date at the top of this policy
- Notifying users through an in-app message for significant changes

We encourage you to review this Privacy Policy periodically.

## International Users

The App can be used anywhere in the world. Your personal learning data is stored locally on your device; if you use Cloud Backup, your account and backup are stored on servers in the United States (Fly.io). Anonymous quiz and purchase analytics are transmitted to and stored on servers located in the United States (Fly.io). No personal data is included in these transfers. Purchase processing by RevenueCat, Apple, and Google may also occur in the United States and other countries.

## California Privacy Rights (CCPA)

Under the California Consumer Privacy Act (CCPA), California residents have certain rights regarding their personal information. Apart from the optional Cloud Backup account (email address and backup), we do not collect personal information that is linked or linkable to you. We do not sell that information, and you can delete it at any time in the App.

## European Union Users (GDPR)

Under the General Data Protection Regulation (GDPR), EU residents have certain rights regarding their personal data.

**Anonymous quiz result records**: The records stored on our server (noun ID, correct/incorrect, quality score, response time) contain no personal data as defined by GDPR Article 4(1). GDPR does not apply to these records.

**Server access logs**: Our server's HTTP access logs contain IP addresses, which are personal data under GDPR. We process these on the basis of **legitimate interest** (Article 6(1)(f)) for server security, abuse detection, and technical debugging. Logs are retained for 30 days. This processing is necessary and proportionate to our operational needs.

**Cloud Backup**: If you create a Cloud Backup account, your email address and backup are personal data. We process them to provide the feature you asked for, on the basis of **performance of a contract** (Article 6(1)(b)), and keep them until you delete your account or it has had no activity for 2 years, whichever comes first. You have the rights of access, rectification, erasure and portability: erasure is available in the App, and you can email us for the rest.

**Advertising and purchases**: AdMob's and RevenueCat's GDPR compliance is governed by Google's and RevenueCat's privacy practices. RevenueCat's anonymous app user ID is processed on the basis of our legitimate interest (Article 6(1)(f)) in validating purchases and restoring access to what you bought.

For any GDPR enquiries, contact us at richard@westmorelandcreative.com.

## Contact Us

If you have any questions about this Privacy Policy or our privacy practices, please contact us:

**Westmoreland Creative, LLC**
Email: richard@westmorelandcreative.com

For questions about AdMob's data practices, please refer to Google's Privacy Policy: https://policies.google.com/privacy. For questions about purchases, see RevenueCat's Privacy Policy: https://www.revenuecat.com/privacy. Our Terms of Service (https://ubenapp.com/terms) also apply.

## Legal Compliance

This Privacy Policy is designed to comply with:

- California Consumer Privacy Act (CCPA)
- General Data Protection Regulation (GDPR)
- Children's Online Privacy Protection Act (COPPA)
- Apple App Store Guidelines
- Google Play Store Requirements

## Summary

**In plain English:**

- ✅ Your learning progress and vocabulary stay on your device, unless you turn on Cloud Backup
- ✅ We can't see what words you're practicing or your personal statistics, unless you turn on Cloud Backup
- ✅ No account required. An account is only needed for the optional Pro Cloud Backup
- ✅ Anonymous quiz results (no name, no location, no device ID) are sent to our server to identify hard words
- ✅ User-added words are never sent to our server, unless you turn on Cloud Backup (it includes them)
- ✅ Pro is a one-time purchase handled by Apple or Google; RevenueCat sees an anonymous ID and your receipt, never your name or email
- ✅ Pro removes ads
- ⚠️ Ads are shown through Google AdMob (they may collect device/ad data)
- ✅ Delete the app = delete all your on-device data permanently (a Cloud Backup stays until you delete your account in the App, or after 2 years without activity)
- ✅ Works completely offline (analytics are sent when online, silently skipped when offline)

**We built Üben to respect your privacy. Your German learning journey is yours alone.**

---

**Effective Date**: This Privacy Policy is effective as of November 15, 2026.

**Questions?** Email us at richard@westmorelandcreative.com
