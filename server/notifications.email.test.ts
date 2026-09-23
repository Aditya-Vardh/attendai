import { describe, expect, it } from "vitest";

describe("AttendAI email provider configuration", () => {
  it("authenticates against the configured Resend account without exposing the credential", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    const sender = process.env.RESEND_FROM_EMAIL;

    expect(apiKey, "RESEND_API_KEY must be configured").toMatch(/^re_/);
    expect(sender, "RESEND_FROM_EMAIL must be configured").toContain("@");

    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    expect(response.status, "The configured Resend API key must authenticate successfully").toBe(200);
  }, 15_000);
});
