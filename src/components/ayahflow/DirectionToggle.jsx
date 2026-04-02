"use client";

export default function DirectionToggle({ enabled, onChange }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-border p-4">
      <div>
        <div className="text-sm font-medium">Test previous ayah too</div>
        <div className="text-xs text-muted">
          Each round also asks &ldquo;What came before?&rdquo;
        </div>
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
          enabled ? "bg-emerald-700" : "bg-emerald-200"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5.5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
