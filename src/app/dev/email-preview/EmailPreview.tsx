'use client';

import { useState } from 'react';
import type { RenderedMail } from '@/lib/mailTemplates';

type Tab = 'buyer' | 'receiver' | 'buyer-text' | 'receiver-text';

export function EmailPreview({
  buyer,
  receiver,
}: {
  buyer: RenderedMail;
  receiver: RenderedMail;
}) {
  const [tab, setTab] = useState<Tab>('buyer');
  const [width, setWidth] = useState<'desktop' | 'mobile'>('desktop');

  const mail =
    tab === 'buyer' || tab === 'buyer-text'
      ? buyer
      : receiver;
  const isText = tab.endsWith('-text');

  return (
    <main className="min-h-screen bg-[#0f0a0c] px-4 py-8 text-[#fdf2f8]">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <p className="font-receipt text-[11px] uppercase tracking-[0.22em] text-[#c99aae]">
            Dev · not in production
          </p>
          <h1 className="mt-2 font-serif text-3xl font-semibold">Email preview</h1>
          <p className="mt-2 max-w-2xl text-[14px] text-[#c99aae]">
            Buyer (post-purchase) and recipient templates with HTML + plain-text alternatives.
            Open this on a phone too; Gmail clients need a real Resend send to fully verify.
          </p>
        </header>

        <div className="mb-4 flex flex-wrap gap-2">
          {(
            [
              ['buyer', 'Buyer HTML'],
              ['receiver', 'Recipient HTML'],
              ['buyer-text', 'Buyer text'],
              ['receiver-text', 'Recipient text'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-full px-4 py-2 text-[13px] font-medium ${
                tab === id ? 'bg-[#ec4899] text-white' : 'bg-white/10 text-[#e0b4c6]'
              }`}
            >
              {label}
            </button>
          ))}
          {!isText ? (
            <>
              <span className="mx-1 self-center text-[#5a3442]">|</span>
              {(['desktop', 'mobile'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setWidth(mode)}
                  className={`rounded-full px-4 py-2 text-[13px] font-medium capitalize ${
                    width === mode ? 'bg-[#f9a8d4] text-[#2d1b22]' : 'bg-white/10 text-[#e0b4c6]'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </>
          ) : null}
        </div>

        <dl className="mb-4 grid gap-1 rounded-xl border border-white/10 bg-black/30 p-4 font-receipt text-[11px] uppercase tracking-[0.12em] text-[#c99aae]">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <dt className="opacity-70">Subject</dt>
            <dd className="normal-case tracking-normal text-[#fdf2f8]">{mail.subject}</dd>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <dt className="opacity-70">Preheader</dt>
            <dd className="normal-case tracking-normal text-[#fdf2f8]">{mail.preheader}</dd>
          </div>
        </dl>

        {isText ? (
          <pre className="overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-[#1a0f14] p-5 font-mono text-[13px] leading-relaxed text-[#fdf2f8]">
            {mail.text}
          </pre>
        ) : (
          <div className="flex justify-center rounded-2xl border border-white/10 bg-[#2a171f] p-4 sm:p-6">
            <iframe
              title={`${tab} email`}
              srcDoc={mail.html}
              className="min-h-[720px] rounded-lg border-0 bg-[#1a0f14] shadow-2xl transition-[width]"
              style={{ width: width === 'mobile' ? 375 : '100%', maxWidth: 640 }}
            />
          </div>
        )}
      </div>
    </main>
  );
}
