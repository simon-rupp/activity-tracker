import "server-only";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

function readEnv(
  name: "APP_BASE_URL" | "RESEND_API_KEY" | "EMAIL_FROM",
): string | null {
  const value = process.env[name];
  return value ? value : null;
}

export function getEmailConfigError(): string | null {
  const baseUrl = readEnv("APP_BASE_URL");
  const apiKey = readEnv("RESEND_API_KEY");
  const from = readEnv("EMAIL_FROM");

  if (!baseUrl) {
    return "APP_BASE_URL is missing.";
  }

  try {
    new URL(baseUrl);
  } catch {
    return "APP_BASE_URL must be a valid absolute URL.";
  }

  if (!apiKey) {
    return "RESEND_API_KEY is missing.";
  }

  if (!from) {
    return "EMAIL_FROM is missing.";
  }

  return null;
}

export function getAppBaseUrl(): string {
  const baseUrl = readEnv("APP_BASE_URL");
  if (!baseUrl) {
    throw new Error("APP_BASE_URL is not configured.");
  }

  const parsed = new URL(baseUrl);
  return parsed.origin;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const configError = getEmailConfigError();
  if (configError) {
    throw new Error(configError);
  }

  const apiKey = readEnv("RESEND_API_KEY");
  const from = readEnv("EMAIL_FROM");
  if (!apiKey || !from) {
    throw new Error("Email configuration is incomplete.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Failed to send email: ${response.status} ${responseText}`);
  }
}
