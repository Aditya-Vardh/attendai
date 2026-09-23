import { and, eq } from "drizzle-orm";
import { notifications, users } from "../../drizzle/schema";
import { createAuditEvent, createInAppNotification, getDb } from "../db";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character] ?? character);
}

export async function sendEmailNotification(input: { recipientUserId: number; recipientEmail?: string | null; title: string; body: string; href?: string; type: string }) {
  const database = await getDb();
  if (!database) return { delivered: false, reason: "database_unavailable" };
  const queued = await database.insert(notifications).values({ recipientUserId: input.recipientUserId, channel: "email", type: input.type, title: input.title, body: input.body, href: input.href ?? null, deliveryStatus: "queued" });
  const notificationId = Number(queued[0].insertId);
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !sender || !input.recipientEmail) {
    await database.update(notifications).set({ deliveryStatus: "not_configured", deliveryError: !input.recipientEmail ? "Recipient email unavailable." : "Email provider configuration unavailable." }).where(eq(notifications.id, notificationId));
    return { delivered: false, reason: "not_configured" };
  }
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: sender, to: [input.recipientEmail], subject: input.title, text: input.body, html: `<main style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:24px"><div style="background:#4f46e5;color:#fff;border-radius:14px;padding:18px 20px;font-weight:700">AttendAI</div><h1 style="font-size:20px;margin:24px 0 12px">${escapeHtml(input.title)}</h1><p style="font-size:15px;line-height:1.6;color:#334155">${escapeHtml(input.body)}</p>${input.href ? `<p style="margin-top:24px"><a href="${escapeHtml(input.href)}" style="background:#4f46e5;color:#fff;padding:11px 16px;border-radius:10px;text-decoration:none">Open AttendAI</a></p>` : ""}</main>` }),
    });
    if (!response.ok) {
      const responseBody = await response.text();
      await database.update(notifications).set({ deliveryStatus: "failed", deliveryError: `Provider response ${response.status}: ${responseBody.slice(0, 320)}` }).where(eq(notifications.id, notificationId));
      return { delivered: false, reason: `provider_${response.status}` };
    }
    await database.update(notifications).set({ deliveryStatus: "sent" }).where(eq(notifications.id, notificationId));
    await createAuditEvent({ action: "notification.email_sent", resourceType: "notification", resourceId: notificationId, metadata: { type: input.type, recipientUserId: input.recipientUserId } });
    return { delivered: true };
  } catch (error) {
    await database.update(notifications).set({ deliveryStatus: "failed", deliveryError: error instanceof Error ? error.message : "Unknown email provider error" }).where(eq(notifications.id, notificationId));
    return { delivered: false, reason: "network_error" };
  }
}

export async function deliverUserNotification(input: { recipientUserId: number; recipientEmail?: string | null; title: string; body: string; href?: string; type: string }) {
  await createInAppNotification({ recipientUserId: input.recipientUserId, title: input.title, body: input.body, href: input.href, type: input.type });
  await createAuditEvent({ action: "notification.in_app_sent", resourceType: "notification", resourceId: null, metadata: { type: input.type, recipientUserId: input.recipientUserId } });
  return sendEmailNotification(input);
}

export async function deliverToRole(role: "admin" | "hr_manager", input: { title: string; body: string; href?: string; type: string }) {
  const database = await getDb();
  if (!database) return [];
  const recipients = await database.select({ id: users.id, email: users.email }).from(users).where(eq(users.role, role));
  return Promise.all(recipients.map(recipient => deliverUserNotification({ ...input, recipientUserId: recipient.id, recipientEmail: recipient.email })));
}
