import Link from 'next/link';

export default function GiftNotFound() {
  return (
    <main className="grid min-app-h place-items-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/40 p-6 text-center shadow-xl">
        <p className="font-pixel text-[9px] uppercase tracking-[0.24em] text-phosphor/70">
          XSO Gift
        </p>
        <h1 className="mt-3 font-arcade text-xl uppercase tracking-[0.12em] text-console-mist">
          Gift not found
        </h1>
        <p className="mt-3 font-mono text-sm text-white/60">
          This link doesn&apos;t match any gift. Double-check the link you were sent, or
          make one of your own.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-phosphor px-6 py-3 font-pixel text-[9px] uppercase tracking-[0.14em] text-[#0a120e]"
        >
          Make an XSO
        </Link>
      </div>
    </main>
  );
}
