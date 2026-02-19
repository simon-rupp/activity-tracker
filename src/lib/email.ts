import "server-only";

type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

function readEnv(
  name:
    | "APP_BASE_URL"
    | "RESEND_API_KEY"
    | "EMAIL_FROM"
    | "VERCEL_BRANCH_URL"
    | "VERCEL_URL",
): string | null {
  const value = process.env[name];
  return value ? value : null;
}

function parseUrlOrigin(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

function resolveAppBaseUrl(): string | null {
  const appBaseUrl = readEnv("APP_BASE_URL");
  if (appBaseUrl) {
    return parseUrlOrigin(appBaseUrl);
  }

  const branchUrl = parseUrlOrigin(readEnv("VERCEL_BRANCH_URL"));
  if (branchUrl) {
    return branchUrl;
  }

  const deploymentUrl = parseUrlOrigin(readEnv("VERCEL_URL"));
  if (deploymentUrl) {
    return deploymentUrl;
  }

  return null;
}

export function getEmailConfigError(): string | null {
  const appBaseUrl = readEnv("APP_BASE_URL");
  const baseUrl = resolveAppBaseUrl();
  const apiKey = readEnv("RESEND_API_KEY");
  const from = readEnv("EMAIL_FROM");

  if (!baseUrl) {
    if (appBaseUrl) {
      return "APP_BASE_URL must be a valid absolute URL.";
    }
    return "APP_BASE_URL is missing.";
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
  const baseUrl = resolveAppBaseUrl();
  if (!baseUrl) {
    throw new Error("APP_BASE_URL is not configured.");
  }

  return baseUrl;
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
