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
    <form onSubmit={onSubmit} className="mt-6 flex w-full max-w-md flex-col gap-3">
      <label className="text-sm font-medium text-zinc-700" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-900/10 focus:ring-4"
        placeholder="you@example.com"
      />
      <input
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        name={honeypotName}
        aria-hidden="true"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {status === "loading" ? "Submitting…" : "Subscribe"}
      </button>
      {message ? (
        <p
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
