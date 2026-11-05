# Sign-in and first vehicle flow

This inventory describes the implemented routes and their purpose; availability of provider flows depends on the configured Supabase project and Android OAuth settings.

1. **Session restoration** — app startup checks the saved session. While it loads, a branded loading screen appears. A session error has Retry and Sign out. It uses the device theme when available, falling back to light.
2. **Login** (`/auth/login`) — email/password sign-in, Continue with Google, a link to account creation, Forgot password and the existing optional email-code sign-in. `/auth/welcome` and `/auth/password` are compatibility entry points. Provider and network errors are displayed; no fake success.
3. **Create account** (`/auth/signup`) — Google or email, password and confirmation on one screen. If the provider requires email confirmation, the verification-code step follows, with resend cooldown and an option to change the email.
4. **Email-code sign-in** (`/auth/verify`) — available from Login, verifies a code or resends it. This remains available under the existing authentication requirements.
5. **Forgot password** (`/auth/reset-password`) — enter email, verify the recovery code, set and confirm the new password, and continue. Recovery stays open after verification creates a session.
6. **Google callback** (`/auth/callback`) — completes the configured OAuth exchange, with error recovery. It is an integration route rather than a separate required form.
7. **Profile setup** (`/settings/profile`) — after a verified sign-in, an account without a display name supplies one; icon, account time zone and System / Light / Dark appearance are available. Profile loading errors offer retry. Saved profile settings remain editable later. The icon requires its pending backend migration; currency selection is not yet implemented.
8. **Home / empty garage** (`/`) — existing assigned vehicles appear after verified access resolution; users without a vehicle can choose Add vehicle. Adding a vehicle is not forced: a user can also be granted access to a shared vehicle.
9. **Add vehicle** (`/garage/add`) — the existing wizard collects category, subtype, energy, meter mode, identity, time zone and optional truthful starting readings, then review/save. New vehicles use the profile time zone as their initial suggestion. Server-confirmed save is required.

The legal page (`/auth/legal`) can be opened from authentication. The app does not create an invite-acceptance step; access grants resolve after verified authentication. The appearance preference is a single choice, not three independent switches. Device dark/light is followed for System; an unavailable device preference falls back to Light. No account, vehicle or server state was changed by this document.
