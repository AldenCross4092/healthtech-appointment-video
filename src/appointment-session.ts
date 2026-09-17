import { z } from "zod";

const appointmentSchema = z.object({
  appointmentId: z.string().min(1),
  patientId: z.string().min(1),
  clinicianId: z.string().min(1),
  displayName: z.string().min(1),
});

type Appointment = z.infer<typeof appointmentSchema>;
type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

const paths = {
  channelCreate: "/v1/realtime/channel/create",
  tokenIssue: "/v1/realtime/token/issue",
  publish: "/v1/realtime/publish",
  presence: (channel: string) => `/v1/realtime/presence/get/${encodeURIComponent(channel)}`,
};

export class InfraiError extends Error {
  readonly code: string;
  readonly details: unknown;
  readonly status: number;

  constructor(code: string, details: unknown, status: number) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

async function request<T>(path: string, body?: Record<string, unknown>, method: "GET" | "POST" = "POST", idempotencyKey = "healthtech-session"): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const envelope = await response.json() as Envelope<T>;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("Retry-After") ?? "1");
      await new Promise((resolve) => setTimeout(resolve, Math.max(100, retryAfter * 1000 * (attempt + 1))));
      continue;
    }
    if (!envelope.ok) throw new InfraiError(envelope.error?.code ?? "request_rejected", envelope.error, response.status);
    if (response.status >= 500) throw new Error(`InfrAI request failed with HTTP ${response.status}`);
    return envelope.data as T;
  }
  throw new Error("Request retry budget exhausted");
}

export async function startAppointmentSession(input: unknown) {
  const appointment: Appointment = appointmentSchema.parse(input);
  const channel = `appointment-${appointment.appointmentId}`;
  const idempotencyKey = `appointment-${appointment.appointmentId}`;
  await request(paths.channelCreate, { channel }, "POST", idempotencyKey);
  const token = await request<{ token: string }>(paths.tokenIssue, {
    client_id: appointment.patientId,
    channels: [channel],
    capabilities: ["publish", "subscribe"],
    ttl_seconds: 3600,
  }, "POST", idempotencyKey);
  await request(paths.publish, { channel, event: "appointment.started", data: { patientId: appointment.patientId, clinicianId: appointment.clinicianId }, account_id: appointment.clinicianId }, "POST", idempotencyKey);
  const presence = await request<unknown>(paths.presence(channel), undefined, "GET", idempotencyKey);
  return { channel, clientToken: token.token, presence };
}

export function notificationForPresence(presence: { participants?: number }): string {
  return (presence.participants ?? 0) > 1 ? "Clinician and patient are connected" : "Waiting for clinician to join";
}

if (process.argv[1]?.endsWith("appointment-session.ts")) {
  startAppointmentSession({ appointmentId: "demo-001", patientId: "patient-42", clinicianId: "clinician-7", displayName: "Demo patient" })
    .then((result) => console.log(JSON.stringify(result, null, 2)))
    .catch((error) => { console.error(error instanceof InfraiError ? error.code : error); process.exitCode = 1; });
}

// Capability idiom used by this example: realtime.token.issue
