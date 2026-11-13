# Expense Tracker (local-first, Android)

Next.js static export + Capacitor + Dexie (IndexedDB) + Supabase sync.

## Setup
1. Install Node.js 22 or newer, then `npm install`
2. Create a Supabase project, run `supabase/schema.sql` in its SQL editor.
3. `cp .env.example .env.local` and fill in the URL and anon key. (Login needs these. In `npm run dev` without them you get a setup screen with a development-only bypass; production builds always require them. Restart `npm run dev` after editing the file.)
4. `npm run dev` to try it in the browser.

## Android
```
npx cap add android      # first time only
npm run build && npx cap copy android
npx cap open android
```
For notifications on Android 13+, add to `android/app/src/main/AndroidManifest.xml`:
`<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />`
After `npm install` of new Capacitor plugins run `npx cap sync android`.

## Login and offline use
- Login uses Supabase email + password (Supabase dashboard: Authentication > Providers > Email on).
- Sign in once with internet. After that the app opens offline using the saved session, and all data saves on the device.
- When the phone is back online, pending changes upload automatically.
- Logout works offline too and removes the saved session from the device.

## Themes
Dark (default) and light, switched with the button in the header. The choice is remembered.

## Publishing
See `PLAY_STORE_CHECKLIST.md` and `PRIVACY_POLICY_TEMPLATE.md`.
