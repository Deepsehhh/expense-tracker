# Google Play release checklist

Requirements below were checked against Google's published policy in Nov 2026. Re-check Play Console before submitting, since rules change.

## Built into this project
- Capacitor 8 (targets Android API 36, the level Google Play requires for new apps and updates since 31 Aug 2026).
- Account creation comes with in-app **Delete account** (Supabase function in `supabase/schema.sql`).
- Privacy Policy link in the app footer (set `NEXT_PUBLIC_PRIVACY_URL`).
- Reminders use inexact timing, so no special alarm permission is needed.

## Your machine
- Node.js 22+, Android Studio Otter (2025.2.1) or newer, JDK 21 (bundled with Android Studio).
- After `npx cap add android`, open `android/variables.gradle` and confirm `targetSdkVersion = 36`, `minSdkVersion = 24`.

## AndroidManifest.xml (android/app/src/main/)
Add inside `<manifest>`:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```
If the merged manifest (Android Studio > Manifest > Merged Manifest) shows `SCHEDULE_EXACT_ALARM` or `USE_EXACT_ALARM`, remove it, because Play restricts these to alarm and calendar apps:
```xml
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" tools:node="remove" />
```
(add `xmlns:tools="http://schemas.android.com/tools"` to the `<manifest>` tag).

## App identity and assets
- Change `appId` in `capacitor.config.ts` (`com.deeps.expensetracker`) to your own unique id BEFORE `cap add android`. It cannot change after publishing.
- Icon and splash: put `assets/icon-only.png` (1024x1024) in the project, then `npx @capacitor/assets generate --android`.
- Increase `versionCode` in `android/app/build.gradle` for every upload.

## Build and sign
1. `npm run build && npx cap sync android`
2. Android Studio > Build > Generate Signed App Bundle > **Android App Bundle (.aab)**. Keep the keystore and passwords safe; losing them blocks future updates. Use Play App Signing.

## Play Console
- Privacy policy URL (host `PRIVACY_POLICY_TEMPLATE.md` as a web page and fill in the blanks).
- **Data safety form:** collected data = email address (account) and financial info (expense entries the user types), both linked to the user, sent to your Supabase server over HTTPS, used for app functionality only, not shared or sold. Users can delete their data (in-app and via the web link below).
- **Account deletion:** declare that users can delete the account in-app, and give a web URL explaining how (Settings > footer > Delete account). A simple page on your site is enough.
- Content rating questionnaire, target audience (18+, not for children), ads: none.
- Store listing: short and full description, at least 2 phone screenshots, 512x512 icon, 1024x500 feature graphic.
- New personal developer accounts have had to run a closed test with a minimum number of testers for a minimum number of days before applying for production. Confirm the current numbers in Play Console.

## Test before upload
- Fresh install: sign up, confirm email, sign in.
- Turn on airplane mode: open the app, add/edit/delete entries, switch dark/light.
- Turn off airplane mode: status line should go to "All changes synced"; check rows in Supabase.
- Tap Enable Alerts > Allow > Test: a notification should appear in about 5 seconds.
- Delete account: sign-in with the same email should then fail.
