# Privacy Policy for Üben

**Last Updated: March 9, 2026**

## Introduction

Westmoreland Creative, LLC ("we," "our," or "us") operates the Üben mobile application (the "App"). This Privacy Policy explains how we handle your information when you use our App.

**The short version: Your personal learning data stays on your device. We also collect anonymous quiz analytics — no account, no name, no location attached.**

## Information Collection and Use

### What We DON'T Collect

Üben is designed with privacy as a core principle. We do not collect:

- Personal identification information (name, email, phone number, etc.)
- Device identifiers or advertising IDs
- Location data
- Your individual learning progress or review history
- Any information that can be used to identify you personally

### What Stays on Your Device

All of your personal learning data is stored locally on your device using SQLite:

- **Vocabulary data**: All German nouns, verbs, and vocabulary you add
- **Learning progress**: Your review history, spaced repetition intervals, and statistics
- **Settings**: Your app preferences and configurations
- **User-added content**: Any custom words you create

This data never leaves your device.

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

## Third-Party Services

### Our Analytics Backend

Anonymous quiz results are stored on our own server (PocketBase, hosted on Fly.io in the United States). Records contain only the data listed above. Raw records are accessible to administrators only; only aggregated summaries are ever shared publicly.

Like any HTTP request, your device's IP address appears in our server's access log. It is not stored in the quiz result record and is not associated with your answers. Access logs are retained for 30 days and then deleted automatically.

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

### Expo Platform

Our App is built using Expo, a React Native framework. Expo may collect minimal technical information for crash reporting and app updates:

- App version information
- Device operating system version
- Crash logs (anonymous, no personal data)

Expo's privacy practices are governed by their Privacy Policy: https://expo.dev/privacy

## Data Storage and Security

- **On-device data**: Controlled entirely by you. Deleting the App removes all local data permanently.
- **Device backups**: Your local data may be included in device backups (iCloud, iTunes, etc.) per your device settings.
- **Analytics server**: Anonymous quiz records are stored on Fly.io servers in the United States. Records contain no personal data.
- **Server access logs**: Retained for 30 days, then deleted. Not linked to quiz result records.

## Children's Privacy

Our App does not knowingly collect any personal information from anyone, including children under 13. The anonymous quiz analytics we collect contain no personally identifiable information. The App is designed to be used by language learners of all ages.

## Data Sharing

We do not sell or share personal data because we do not collect personal data. Aggregated, anonymised quiz statistics (e.g., "the ten hardest nouns for learners") may be published in blog posts or shown inside the App.

## Your Rights

Since we do not collect personal data linked to you, there is generally nothing to access, modify, or delete. You have complete control over your on-device data through:

- Deleting the App (removes all local data)
- Managing your device's storage
- Controlling your device's backup settings

EU residents may contact us at richard@westmorelandcreative.com with any GDPR-related questions.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any changes by:

- Posting the new Privacy Policy in the App
- Updating the "Last Updated" date at the top of this policy
- Notifying users through an in-app message for significant changes

We encourage you to review this Privacy Policy periodically.

## International Users

The App can be used anywhere in the world. Your personal learning data is stored locally on your device. Anonymous quiz analytics are transmitted to and stored on servers located in the United States (Fly.io). No personal data is included in these transfers.

## California Privacy Rights (CCPA)

Under the California Consumer Privacy Act (CCPA), California residents have certain rights regarding their personal information. Since we do not collect personal information that is linked or linkable to you, CCPA does not materially apply to our App.

## European Union Users (GDPR)

Under the General Data Protection Regulation (GDPR), EU residents have certain rights regarding their personal data.

**Anonymous quiz result records**: The records stored on our server (noun ID, correct/incorrect, quality score, response time) contain no personal data as defined by GDPR Article 4(1). GDPR does not apply to these records.

**Server access logs**: Our server's HTTP access logs contain IP addresses, which are personal data under GDPR. We process these on the basis of **legitimate interest** (Article 6(1)(f)) for server security, abuse detection, and technical debugging. Logs are retained for 30 days. This processing is necessary and proportionate to our operational needs.

**Advertising**: AdMob's GDPR compliance is governed by Google's privacy practices.

For any GDPR enquiries, contact us at richard@westmorelandcreative.com.

## Contact Us

If you have any questions about this Privacy Policy or our privacy practices, please contact us:

**Westmoreland Creative, LLC**
Email: richard@westmorelandcreative.com

For questions about AdMob's data practices, please refer to Google's Privacy Policy: https://policies.google.com/privacy

## Legal Compliance

This Privacy Policy is designed to comply with:

- California Consumer Privacy Act (CCPA)
- General Data Protection Regulation (GDPR)
- Children's Online Privacy Protection Act (COPPA)
- Apple App Store Guidelines
- Google Play Store Requirements

## Summary

**In plain English:**

- ✅ Your learning progress and vocabulary stay on your device
- ✅ We can't see what words you're practicing or your personal statistics
- ✅ No account required, no login
- ✅ Anonymous quiz results (no name, no location, no device ID) are sent to our server to identify hard words
- ✅ User-added words are never sent to our server
- ⚠️ Ads are shown through Google AdMob (they may collect device/ad data)
- ✅ Delete the app = delete all your on-device data permanently
- ✅ Works completely offline (analytics are sent when online, silently skipped when offline)

**We built Üben to respect your privacy. Your German learning journey is yours alone.**

---

**Effective Date**: This Privacy Policy is effective as of March 9, 2026.

**Questions?** Email us at richard@westmorelandcreative.com
