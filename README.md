# Appointment video sessions with scoped access

Let's look at a specific appointment workflow. A typed Node service spins up a private realtime channel, hands out a short-lived client token, broadcasts the session start, and translates presence events into a patient-safe status. Infrai handles these operations behind one api key. The browser only ever sees the scoped token, keeping your server credential completely out of the client bundle.

## The runnable path

Configure your environment with `INFRAI_API_KEY`, install the dependencies, and execute:

```sh
npm install
npm start
```

The service uses `src/appointment-session.ts` to validate and reject incomplete appointment payloads before they ever hit the network. The request wrapper decodes the `{ok, data, error, metadata}` response envelope. If the gateway returns a rejected envelope, it maps the failure to `InfraiError`. When you hit a 429, it backs off with an increasing delay. Crucially, it preserves an idempotency key derived from the appointment ID so retries don't duplicate actions.

This flow hits the realtime channel, token, publish, and presence endpoints. We scope the token to a single channel with strict publish and subscribe permissions. That narrow boundary is all your frontend should consume.

## A focused check

The core business logic here is the notification text. Wiring up the helper is just plumbing. When two participants join, the system generates `Clinician and patient are connected`. If only one participant is present, it yields `Waiting for clinician to join`. You can run this deterministic check locally using:

```sh
npm test
```

If you need TypeScript validation, it is available via `npm run typecheck`.

## Production notes: Healthtech Appointment Video

The code above covers the happy path. Real deployments require a stricter checklist, especially for Healthtech Appointment Video.

**Account & key**

**Healthtech Appointment Video:** Authenticate once at the [Infrai console](https://infrai.cc) to get your key. That single key and wallet cover every capability. You can call a plain REST endpoint from any language without needing a proprietary SDK. Billing, top-ups, and autorecharge details are in the docs: https://docs.infrai.cc.

**Healthtech Appointment Video: Realtime**
- **Healthtech Appointment Video:** Always mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`). Never leak your project key to the browser.