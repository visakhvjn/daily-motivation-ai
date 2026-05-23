import { SubscribeForm } from "@/app/subscribe-form";

export function SubscribeCard() {
  return (
    <section className="min-w-0 rounded-2xl border border-violet-200/60 bg-gradient-to-br from-white via-white to-violet-50/80 p-5 shadow-[0_8px_30px_rgba(124,58,237,0.08)] sm:rounded-3xl sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
        Get the daily email
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">
        Enter your email and confirm via the link we send you. We only mail
        verified subscribers.
      </p>
      <SubscribeForm />
    </section>
  );
}
