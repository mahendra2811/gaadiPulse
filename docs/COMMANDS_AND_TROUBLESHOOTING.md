# Commands and troubleshooting reference

Commands depend on versions Codex pins to compatible Expo/Supabase releases; don't blindly use stale CLI syntax.

```bash
# After Codex initializes app
npm install
npx expo-doctor
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npx expo start --dev-client
npx expo run:android

# Validate release config when credentials exist
npx expo config --type public
npx eas build --platform android --profile preview

# Supabase local development (requires Docker or compatible runtime)
npx supabase start
npx supabase db reset
npx supabase test db
```

## Common issues
- Google Sign-In fails: check Android package name, SHA fingerprints, provider config, redirect URI, installed build vs Expo Go limitations.
- Empty Garage for assigned Pilot: verify email confirmed, normalize email, execute trusted access-claim RPC, refetch memberships.
- Some Pilot tabs hidden: expected when permission removed; test backend denial too.
- Loader stuck: ensure required query cancellation/error settles route loading coordinator.
- Wrong mileage: check full-to-full interval, partial fuel accumulation, missing odometer, counter reset and energy unit.
- Form submission rejected: compare schema version, allowed date window, vehicle timezone, role and required custom fields.
- Outbox duplicates: verify immutable UUID operation ID persisted before first request and UNIQUE constraint on server.
- Asset blank on Android: convert SVGs to local PNG or use configured react-native-svg component; dynamic `require` paths are unsupported.
