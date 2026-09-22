import { GiftUnboxing } from '@/components/xso/GiftUnboxing';

export default function GiftPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="min-app-h">
      <header className="flex items-center gap-3 px-4 pt-5 lg:px-8">
        <span className="grid h-8 w-8 place-items-center border border-acid font-display text-xs font-extrabold tracking-wide text-acid">
          BB
        </span>
        <span className="font-display text-sm font-bold tracking-wide">
          XSO Gift Unboxing
        </span>
      </header>

      <GiftUnboxing giftId={params.id} />
    </main>
  );
}
