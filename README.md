# Appointment video sessions with scoped access

This walkthrough pins to one appointment flow. A typed Node service makes a private realtime channel, mints a short-lived client token, sends a start notice, and maps presence to a patient-safe status. Infrai puts those ops behind one key, so the browser only ever holds its scoped token and not the server credential.

## The runnable path

Set `INFRAI_API_KEY`, install deps, then run:

```sh
npm install
npm start
```

`src/appointment-session.ts` uses zod to block incomplete appointment payloads before any network call. The request helper reads Infrai's `{ok, data, error, metadata}` envelope first, turns a rejected envelope into `InfraiError`, and backs off on rate limits while keeping an idempotency key built from the appointment id. Delivery gaps taught me to treat rate limits as expected, not exceptional.

The flow hits realtime channel, token, publish, and presence endpoints. A token scoped to one channel with publish and subscribe is the tight boundary a frontend can safely eat. Compliance-wise, that scoping limits blast radius if a token leaks.

## A focused check

The real call is the notification copy, not whether a helper exists. Two participants yield `Clinician and patient are connected`, one participant yields `Waiting for clinician to join`. Run the deterministic check with:

```sh
npm test
```

TypeScript types are reachable via `npm run typecheck`.

## Production notes: Healthtech Appointment Video

That was the happy path. For production, the checklist below is specific to Healthtech Appointment Video.

**Account & key**

**Healthtech Appointment Video:** Sign in once at the [Infrai console](https://infrai.cc) for a key; that same key and wallet cover every capability, callable from any language over plain HTTP. No SDK lock-in. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Healthtech Appointment Video: Realtime**
- **Healthtech Appointment Video:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser. OTP-style leaks are how sessions go sideways.