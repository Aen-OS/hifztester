import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// In-memory rate limiting: IP -> { count, resetAt }
const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function POST(request) {
  // Get client IP from headers (works behind proxies/Vercel)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { _hp, name, email, message } = body;

  // Honeypot: if filled, silently succeed (don't reveal to bots)
  if (_hp) {
    return Response.json({ success: true });
  }

  // Validate required field
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  // Rate limit check
  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

  const senderName = (name && name.trim()) || "Anonymous";
  const senderEmail = (email && email.trim()) || "Not provided";
  const toEmail = process.env.FEEDBACK_TO_EMAIL;

  if (!toEmail) {
    return Response.json(
      { error: "Feedback destination not configured" },
      { status: 500 }
    );
  }

  const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Feedback from ${senderName}</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color:#0f5c3a;padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;">Itqaan Feedback</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:16px;">
                    <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">From</p>
                    <p style="margin:0;font-size:15px;color:#111827;">${senderName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:24px;">
                    <p style="margin:0 0 4px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Email</p>
                    <p style="margin:0;font-size:15px;color:#111827;">${senderEmail}</p>
                  </td>
                </tr>
                <tr>
                  <td>
                    <p style="margin:0 0 8px 0;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Message</p>
                    <div style="background-color:#f9fafb;border-left:4px solid #0f5c3a;padding:16px;border-radius:0 4px 4px 0;">
                      <p style="margin:0;font-size:15px;color:#111827;line-height:1.6;white-space:pre-wrap;">${message.trim()}</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f3f4f6;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">Sent via the Itqaan feedback form</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    const { error } = await resend.emails.send({
      from: "Itqaan Feedback <onboarding@resend.dev>",
      to: toEmail,
      subject: `Feedback from ${senderName}`,
      html: htmlBody,
    });

    if (error) {
      console.error("Resend error:", error);
      return Response.json(
        { error: "Failed to send feedback. Please try again." },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Feedback route error:", err);
    return Response.json(
      { error: "Failed to send feedback. Please try again." },
      { status: 500 }
    );
  }
}
