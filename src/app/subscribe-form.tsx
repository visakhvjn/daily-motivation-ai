"use client";

import { useMemo, useState } from "react";

export function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  const honeypotName = useMemo(() => "website", []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const form = new FormData(e.currentTarget);
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          website: form.get(honeypotName) ?? "",
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong");
        return;
      }
      setStatus("done");
      setMessage(data.message ?? "Check your inbox.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex w-full max-w-md flex-col gap-4">
      <label className="text-sm font-medium text-zinc-700" htmlFor="email">
        Email address
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 shadow-sm outline-none transition-shadow placeholder:text-zinc-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-500/15"
          placeholder="you@example.com"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex h-12 shrink-0 items-center justify-center rounded-xl bg-violet-600 px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:opacity-60"
        >
          {status === "loading" ? "Submitting…" : "Subscribe"}
        </button>
      </div>
      <input
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        name={honeypotName}
        aria-hidden="true"
      />
      {message ? (
        <p
          role="status"
          className={
            status === "error"
              ? "text-sm text-red-700"
              : "text-sm text-zinc-600"
          }
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
