import { CREATOR_SITE_URL } from "@/lib/site-links";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-zinc-200/80 bg-white/60 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-1 px-6 py-8 text-center text-sm text-zinc-500">
        <p>
          Made by{" "}
          <a
            href={CREATOR_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-zinc-800 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-violet-700 hover:decoration-violet-300"
          >
            Visakh Vijayan
          </a>
        </p>
      </div>
    </footer>
  );
}
