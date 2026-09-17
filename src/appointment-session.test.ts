import assert from "node:assert/strict";
import { notificationForPresence } from "./appointment-session.ts";

assert.equal(notificationForPresence({ participants: 2 }), "Clinician and patient are connected");
assert.equal(notificationForPresence({ participants: 1 }), "Waiting for clinician to join");
console.log("notification decision tests passed");
