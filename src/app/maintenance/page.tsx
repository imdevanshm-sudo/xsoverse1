import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'XSOverse · Almost ready',
  robots: { index: false, follow: false },
};

/** Shown in place of the store while it's in test mode. */
export default function MaintenancePage() {
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center bg-[#1a0f14] px-6 text-center text-[#fffaf0]">
      <p className="font-receipt text-[13px] uppercase tracking-[0.3em] text-[#fdba74]">
        XSOverse
      </p>
      <h1 className="mt-4 max-w-[18ch] text-balance font-serif text-[36px] font-semibold leading-tight sm:text-[48px]">
        We&apos;re putting on the finishing touches.
      </h1>
      <p className="mt-4 max-w-[34ch] text-[16px] leading-relaxed text-[#fffaf0]/75">
        The store is being updated and will be back shortly. If someone sent you a souvenir,
        your link still opens as usual.
      </p>
    </main>
  );
}
