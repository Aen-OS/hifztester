"use client";

import { useState } from "react";

export default function FeedbackModal({ open, onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!open) return null;

  function handleClose() {
    setStatus("idle");
    setErrorMessage("");
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, _hp: hp }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setStatus("sent");
    } catch (err) {
      setErrorMessage(err.message || "Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-lg bg-surface border border-border shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="font-display text-lg text-ink">Send Feedback</span>
          <button
            type="button"
            onClick={handleClose}
            className="text-muted hover:text-ink transition-colors"
            aria-label="Close"
          >
            &#x2715;
          </button>
        </div>

        {/* Body */}
        {status === "sent" ? (
          <div className="px-5 py-4 space-y-4 text-center">
            <p className="text-emerald-700 font-display text-lg">Thank you!</p>
            <p className="text-xs text-muted">Your feedback has been sent.</p>
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-md bg-emerald-700 py-2 text-sm text-white hover:bg-emerald-400 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {/* Honeypot */}
            <input
              type="text"
              name="_hp"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              className="absolute -left-[9999px] opacity-0 h-0 w-0"
            />

            {/* Name */}
            <div>
              <label className="block text-sm text-ink mb-1">
                Name <span className="text-muted">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-border bg-base px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-ink mb-1">
                Email <span className="text-muted">(optional)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-border bg-base px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <p className="text-xs text-muted mt-1">
                Without contact info, the developer can&apos;t follow up if clarification is needed.
              </p>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm text-ink mb-1">
                Message <span className="text-red-600">*</span>
              </label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-md border border-border bg-base px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* Error */}
            {status === "error" && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-md bg-emerald-700 py-2 text-sm text-white hover:bg-emerald-400 transition-colors disabled:opacity-50"
            >
              {status === "sending" ? "Sending..." : "Send"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
