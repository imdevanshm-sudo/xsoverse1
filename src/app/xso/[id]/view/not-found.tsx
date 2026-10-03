export default function ViewNotFound() {
  return (
    <main className="grid min-app-h place-items-center bg-black px-8 text-center">
      <div>
        <h1 className="font-display text-[15px] font-light tracking-[0.06em] text-white/70">
          There&apos;s nothing here.
        </h1>
        <p className="mt-3 text-[13px] text-white/40">Check the link you were sent.</p>
      </div>
    </main>
  );
}
