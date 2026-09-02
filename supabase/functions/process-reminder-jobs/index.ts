import { createClient } from "npm:@supabase/supabase-js@2";

type MessageJob = {
  id: string;
  assignment_id: string | null;
  recipient_profile_id: string;
  template_key: string;
  context: unknown;
};

type Assignment = {
  assignment_status: string;
  assignment_generation: number;
  shift_id: string;
};

type Shift = {
  starts_at: string;
  ends_at: string;
  volunteer_instructions: string | null;
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

function validWorkerRequest(request: Request): boolean {
  const secret = Deno.env.get("REMINDER_CRON_SECRET");
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function formatWhen(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Denver",
  }).format(new Date(value));
}

function messageFor(templateKey: string, shift: Shift, portalUrl: string): { subject: string; html: string; text: string } {
  const when = formatWhen(shift.starts_at);
  const instruction = shift.volunteer_instructions?.trim();
  const template = {
    assignment_confirmation: {
      subject: "You are scheduled to serve · The Altar Initiative",
      lead: "Thank you for serving in the Prayer Room.",
      prompt: "Your serving time has been scheduled for",
    },
    assignment_seven_day_reminder: {
      subject: "One week until your Prayer Room serving time",
      lead: "A gentle reminder from The Altar Initiative.",
      prompt: "Your serving time is one week away:",
    },
    assignment_24_hour_reminder: {
      subject: "Tomorrow: your Prayer Room serving time",
      lead: "Thank you for making room to serve.",
      prompt: "Your serving time is tomorrow:",
    },
    unconfirmed_shift_escalation: {
      subject: "Please confirm your Prayer Room serving time",
      lead: "Your serving time still needs confirmation.",
      prompt: "Please check your schedule for this upcoming time:",
    },
  }[templateKey] ?? {
    subject: "Prayer Room schedule update",
    lead: "There is an update to your Prayer Room schedule.",
    prompt: "Scheduled time:",
  };

  const instructions = instruction ? `<p><strong>Notes:</strong> ${escapeHtml(instruction)}</p>` : "";
  const textInstructions = instruction ? `\nNotes: ${instruction}` : "";
  return {
    subject: template.subject,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2421;line-height:1.55"><p>The Altar Initiative</p><h1>${escapeHtml(template.lead)}</h1><p>${escapeHtml(template.prompt)}</p><p><strong>${escapeHtml(when)}</strong></p>${instructions}<p><a href="${portalUrl}" style="display:inline-block;background:#3f5f5b;color:#f5f1e8;padding:12px 18px;text-decoration:none">View my schedule</a></p></body></html>`,
    text: `${template.lead}\n\n${template.prompt}\n${when}${textInstructions}\n\nView your schedule: ${portalUrl}`,
  };
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function contextAllowsDelivery(job: MessageJob, assignment: Assignment): boolean {
  if (!job.context || typeof job.context !== "object") return false;
  const context = job.context as { generation?: unknown; valid_statuses?: unknown };
  return typeof context.generation === "number"
    && context.generation === assignment.assignment_generation
    && Array.isArray(context.valid_statuses)
    && context.valid_statuses.includes(assignment.assignment_status);
}

async function complete(
  client: ReturnType<typeof createClient>,
  job: MessageJob,
  workerId: string,
  status: "sent" | "failed" | "skipped" | "cancelled",
  providerMessageId?: string,
  error?: string,
): Promise<void> {
  const { error: completionError } = await client.rpc("complete_message_job", {
    p_job_id: job.id,
    p_worker_id: workerId,
    p_status: status,
    p_provider_message_id: providerMessageId ?? null,
    p_last_error: error?.slice(0, 1000) ?? null,
  });
  if (completionError) throw new Error(`Unable to complete message job: ${completionError.message}`);
}

async function sendWithResend(input: {
  from: string;
  jobId: string;
  message: { subject: string; html: string; text: string };
  recipient: string;
  resendApiKey: string;
}): Promise<string> {
  const providerResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.resendApiKey}`,
      "Content-Type": "application/json",
      // A retry after a timeout is safe: Resend treats this job id as the same send.
      "Idempotency-Key": `altar-reminder-${input.jobId}`,
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.recipient],
      subject: input.message.subject,
      html: input.message.html,
      text: input.message.text,
    }),
  });
  const body = await providerResponse.json().catch(() => ({})) as { id?: unknown; message?: unknown };
  if (!providerResponse.ok || typeof body.id !== "string") {
    throw new Error(typeof body.message === "string" ? body.message : `Resend rejected the message (${providerResponse.status}).`);
  }
  return body.id;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!validWorkerRequest(request)) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  const siteUrl = Deno.env.get("SITE_URL")?.replace(/\/$/, "");
  if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !from || !siteUrl) {
    console.error("Reminder worker is missing server configuration.");
    return json({ error: "Reminder worker is not configured" }, 503);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const workerId = crypto.randomUUID();
  const { data: claimed, error: claimError } = await client.rpc("claim_due_message_jobs", { p_limit: 25, p_worker_id: workerId });
  if (claimError) {
    console.error("Unable to claim reminder jobs.", claimError.code);
    return json({ error: "Unable to claim reminder jobs" }, 503);
  }

  const totals = { claimed: (claimed ?? []).length, sent: 0, skipped: 0, failed: 0 };
  for (const job of (claimed ?? []) as MessageJob[]) {
    try {
      if (!job.assignment_id) {
        await complete(client, job, workerId, "skipped", undefined, "No assignment is associated with this reminder.");
        totals.skipped += 1;
        continue;
      }
      const [{ data: assignment, error: assignmentError }, { data: preference, error: preferenceError }] = await Promise.all([
        client.from("shift_assignments").select("assignment_status, assignment_generation, shift_id").eq("id", job.assignment_id).maybeSingle<Assignment>(),
        client.from("email_preferences").select("email, email_reminders_opt_in").eq("profile_id", job.recipient_profile_id).maybeSingle<{ email: string; email_reminders_opt_in: boolean }>(),
      ]);
      if (assignmentError || preferenceError) throw new Error("Unable to load current reminder delivery data.");
      if (!assignment || !preference?.email_reminders_opt_in || !contextAllowsDelivery(job, assignment)) {
        await complete(client, job, workerId, "skipped", undefined, "The assignment or reminder preference is no longer eligible for delivery.");
        totals.skipped += 1;
        continue;
      }

      const { data: shift, error: shiftError } = await client.from("shifts").select("starts_at, ends_at, volunteer_instructions").eq("id", assignment.shift_id).maybeSingle<Shift>();
      if (shiftError) throw new Error("Unable to load the scheduled shift.");
      if (!shift) {
        await complete(client, job, workerId, "skipped", undefined, "The scheduled shift no longer exists.");
        totals.skipped += 1;
        continue;
      }

      const providerMessageId = await sendWithResend({
        from,
        jobId: job.id,
        message: messageFor(job.template_key, shift, `${siteUrl}/portal`),
        recipient: preference.email,
        resendApiKey,
      });
      await complete(client, job, workerId, "sent", providerMessageId);
      totals.sent += 1;
    } catch (error) {
      try {
        await complete(client, job, workerId, "failed", undefined, error instanceof Error ? error.message : "Unknown reminder delivery failure.");
        totals.failed += 1;
      } catch (completionError) {
        console.error("Reminder job could not be marked failed.", completionError instanceof Error ? completionError.message : "unknown error");
        totals.failed += 1;
      }
    }
  }

  return json(totals);
});
