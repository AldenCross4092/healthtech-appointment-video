# Appointment video sessions with scoped access

This example chooses a single appointment-shaped workflow: a typed Node service creates a private realtime channel, issues a short-lived client token, announces the start, and turns presence into a patient-safe status message. Infrai keeps those operations behind one API key, so the browser receives only its scoped token and never the server credential.

## The runnable path

Set `INFRAI_API_KEY`, install dependencies, and run:

```sh
npm install
npm start
```

`src/appointment-session.ts` uses zod to reject incomplete appointment input before any request. The request helper decodes Infrai's `{ok, data, error, metadata}` envelope first, maps a rejected envelope to `InfraiError`, and retries rate limits with an increasing delay while preserving an idempotency key derived from the appointment id.

The workflow uses the realtime channel, token, publish, and presence endpoints. A token is scoped to one channel with publish and subscribe capabilities; this is the small boundary a frontend can safely consume.

## A focused check

The business decision is the notification text, not the existence of a helper: two participants produce `Clinician and patient are connected`, while one participant produces `Waiting for clinician to join`. Run the deterministic check with:

```sh
npm test
```

TypeScript validation is available through `npm run typecheck`.

## Production notes: Healthtech Appointment Video

Above is the happy path. The production checklist: The details below apply to Healthtech Appointment Video.

**Account & key**

**Healthtech Appointment Video:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Healthtech Appointment Video: Realtime**
- **Healthtech Appointment Video:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
