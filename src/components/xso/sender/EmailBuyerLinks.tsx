'use client';

import { useState, type FormEvent } from 'react';

/** Re-sends the buyer “keepsake sealed” email with manage + gift links. */
export function EmailBuyerLinks({ giftId, manageKey }: { giftId: string; manageKey: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setMessage('');
    try {
      const res = await fetch(`/api/gifts/${encodeURIComponent(giftId)}/confirm-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: manageKey, email }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string; emailed?: string };
      if (!res.ok) {
        setState('error');
        setMessage(json.error || 'Couldn’t send. Try again.');
        return;
      }
      if (json.emailed === 'failed') {
        setState('error');
        setMessage('Mail didn’t go through. Try again in a minute.');
        return;
      }
      setState('sent');
      setMessage('Sent — check your inbox (and spam) for your dashboard + gift links.');
      setEmail('');
    } catch {
      setState('error');
      setMessage('Couldn’t reach the mail service. Try again.');
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-4 border-t border-dashed border-[#f0cfdc] pt-4"
      aria-label="Email yourself the dashboard links"
    >
      <p className="font-receipt text-[11px] uppercase tracking-[0.16em] text-[#b48799]">
        Email yourself the links
      </p>
      <p className="mt-1 text-[13px] leading-snug text-[#6b4558]">
        Didn’t get the receipt email? We’ll send your private dashboard and gift link here.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor={`buyer-email-${giftId}`}>
          Your email
        </label>
        <input
          id={`buyer-email-${giftId}`}
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== 'idle' && state !== 'sending') setState('idle');
          }}
          placeholder="you@email.com"
          className="paper-field min-h-11 flex-1 font-receipt text-[14px]"
        />
        <button
          type="submit"
          disabled={state === 'sending' || !email.trim()}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-[#ec4899]/40 bg-white px-5 font-serif text-[16px] font-semibold text-[#be185d] disabled:opacity-50"
        >
          {state === 'sending' ? 'Sending…' : 'Email me'}
        </button>
      </div>
      {message ? (
        <p
          role="status"
          className={`mt-2 text-[13px] ${state === 'error' ? 'text-[#b4234a]' : 'text-[#5a7a4a]'}`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
