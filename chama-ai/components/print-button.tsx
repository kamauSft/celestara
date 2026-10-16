"use client";

export function PrintButton() {
  return (
    <button
      className="no-print rounded-full border border-stone-400 px-4 py-2 text-sm"
      type="button"
      onClick={() => window.print()}
    >
      Print statement
    </button>
  );
}
