# Feedback Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a feedback button in the header that opens a modal form, sending submissions via Resend email with honeypot + rate limiting spam protection.

**Architecture:** A `FeedbackModal` client component is toggled from the header. Form submissions POST to `/api/feedback`, which validates input (honeypot check, rate limit by IP), then sends an email via Resend. No database needed.

**Tech Stack:** Resend SDK, Next.js API route, React state for modal

---

### Task 1: Install Resend

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install resend**

```bash
npm install resend
```

- [ ] **Step 2: Add RESEND_API_KEY to .env.local**

Add to `.env.local`:
```
RESEND_API_KEY=re_xxxxx
FEEDBACK_TO_EMAIL=an.interstudio@gmail.com
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install resend for feedback email"
```

---

### Task 2: Create the API route

**Files:**
- Create: `src/app/api/feedback/route.js`

- [ ] **Step 1: Create the API route with honeypot, rate limiting, and Resend**

Create `src/app/api/feedback/route.js`:

```js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const TO_EMAIL = process.env.FEEDBACK_TO_EMAIL;

// In-memory rate limiting: IP -> [timestamps]
const rateMap = new Map();
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = rateMap.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  rateMap.set(ip, recent);
  if (recent.length >= RATE_LIMIT) return true;
  recent.push(now);
  rateMap.set(ip, recent);
  return false;
}

export async function POST(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  if (isRateLimited(ip)) {
    return Response.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { name, email, message, _hp } = body;

  // Honeypot: if filled, silently succeed (don't reveal to bots)
  if (_hp) {
    return Response.json({ success: true });
  }

  if (!message || !message.trim()) {
    return Response.json({ error: "Message is required." }, { status: 400 });
  }

  const senderName = name?.trim() || "Anonymous";
  const senderEmail = email?.trim() || "Not provided";

  try {
    await resend.emails.send({
      from: "Itqaan Feedback <onboarding@resend.dev>",
      to: TO_EMAIL,
      subject: `Feedback from ${senderName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px;">
          <h2 style="color: #0f5c3a;">New Feedback</h2>
          <p><strong>Name:</strong> ${senderName}</p>
          <p><strong>Email:</strong> ${senderEmail}</p>
          <hr style="border: 1px solid #d4e8dc;" />
          <p style="white-space: pre-wrap;">${message.trim()}</p>
        </div>
      `,
    });

    return Response.json({ success: true });
  } catch {
    return Response.json(
      { error: "Failed to send feedback. Please try again." },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/feedback/route.js
git commit -m "feat: add /api/feedback route with resend, honeypot, rate limiting"
```

---

### Task 3: Create the FeedbackModal component

**Files:**
- Create: `src/components/FeedbackModal.jsx`

- [ ] **Step 1: Create the modal component**

Create `src/components/FeedbackModal.jsx`:

```jsx
"use client";

import { useState } from "react";

export default function FeedbackModal({ open, onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState("");

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, _hp: hp }),
      });

      if (res.ok) {
        setStatus("sent");
        setName("");
        setEmail("");
        setMessage("");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Something went wrong.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  function handleClose() {
    setStatus("idle");
    setErrorMsg("");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleClose}>
      <div
        className="w-full max-w-md mx-4 rounded-lg bg-surface border border-border shadow-lg"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-display text-lg text-ink">Send Feedback</h2>
          <button
            onClick={handleClose}
            className="text-muted hover:text-ink transition-colors text-xl leading-none"
            aria-label="Close">
            &times;
          </button>
        </div>

        {status === "sent" ? (
          <div className="px-5 py-8 text-center">
            <p className="text-emerald-700 font-display text-lg mb-2">
              Thank you!
            </p>
            <p className="text-sm text-muted">
              Your feedback has been sent.
            </p>
            <button
              onClick={handleClose}
              className="mt-4 rounded-md bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-400 transition-colors">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {/* Honeypot - hidden from real users */}
            <input
              type="text"
              name="_hp"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] opacity-0 h-0 w-0"
            />

            <div>
              <label
                htmlFor="fb-name"
                className="block text-sm text-ink mb-1">
                Name{" "}
                <span className="text-muted text-xs">(optional)</span>
              </label>
              <input
                id="fb-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-border bg-base px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="Your name"
              />
            </div>

            <div>
              <label
                htmlFor="fb-email"
                className="block text-sm text-ink mb-1">
                Email{" "}
                <span className="text-muted text-xs">(optional)</span>
              </label>
              <input
                id="fb-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-base px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="you@example.com"
              />
              <p className="mt-1 text-xs text-muted">
                Without contact info, the developer can&apos;t follow up if
                clarification is needed.
              </p>
            </div>

            <div>
              <label
                htmlFor="fb-message"
                className="block text-sm text-ink mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="fb-message"
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-md border border-border bg-base px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-y"
                placeholder="What's on your mind?"
              />
            </div>

            {errorMsg && (
              <p className="text-sm text-red-600">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-md bg-emerald-700 py-2 text-sm text-white hover:bg-emerald-400 transition-colors disabled:opacity-50">
              {status === "sending" ? "Sending..." : "Send Feedback"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FeedbackModal.jsx
git commit -m "feat: add FeedbackModal component"
```

---

### Task 4: Add feedback button to header

**Files:**
- Modify: `src/components/QuranAuthHeader.jsx`

- [ ] **Step 1: Add feedback state + modal to QuranAuthHeader**

Import at top of `QuranAuthHeader.jsx`:
```jsx
import FeedbackModal from "@/components/FeedbackModal";
```

Add state inside the component function:
```jsx
const [feedbackOpen, setFeedbackOpen] = useState(false);
```

The feedback button should appear in ALL three header states (loading, not connected, connected). Add a small "Feedback" link/button and the `<FeedbackModal>` to each return branch.

**Loading state** — replace the existing return:
```jsx
if (loading) {
  return (
    <div className="w-full border-b border-border bg-surface px-4 py-2 text-center text-xs text-muted font-body">
      <div className="mx-auto flex max-w-[680px] items-center justify-between">
        <span>Loading...</span>
        <button
          onClick={() => setFeedbackOpen(true)}
          className="text-xs text-muted hover:text-ink transition-colors">
          Feedback
        </button>
      </div>
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
```

**Not connected state** — replace the existing return:
```jsx
if (!connected) {
  return (
    <div className="w-full border-b border-border bg-surface px-4 py-2 font-body">
      <div className="mx-auto flex max-w-[680px] items-center justify-between">
        <a
          href="/api/auth/quran"
          className="text-xs text-emerald-700 underline underline-offset-2 hover:text-emerald-400 transition-colors">
          Connect Quran.com
        </a>
        <button
          onClick={() => setFeedbackOpen(true)}
          className="text-xs text-muted hover:text-ink transition-colors">
          Feedback
        </button>
      </div>
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  );
}
```

**Connected state** — add the feedback button between the Disconnect link and closing tags, and add the modal:
```jsx
return (
  <div className="w-full border-b border-border bg-surface px-4 py-2 font-body">
    <div className="mx-auto flex max-w-[680px] items-center justify-between">
      <span className="text-xs text-ink">
        {/* ...existing streak/error content unchanged... */}
      </span>
      <span className="flex items-center gap-3">
        <button
          onClick={() => setFeedbackOpen(true)}
          className="text-xs text-muted hover:text-ink transition-colors">
          Feedback
        </button>
        <a
          href="/api/auth/quran/logout"
          className="text-xs text-muted hover:text-ink transition-colors">
          Disconnect
        </a>
      </span>
    </div>
    <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
  </div>
);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/QuranAuthHeader.jsx
git commit -m "feat: add feedback button to header with modal"
```

---

### Task 5: Add env var to .env.local and verify build

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Ensure RESEND_API_KEY and FEEDBACK_TO_EMAIL are in .env.local**

The user must add their actual Resend API key. Verify the env vars exist.

- [ ] **Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: finalize feedback form setup"
```
