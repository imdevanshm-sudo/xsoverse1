'use client';

import { useState, type FormEvent } from 'react';

/**
 * Optional: the buyer emails the recipient the /view link only (never the manage key).
 * The gift link can still be copied above if they'd rather send it themselves.
 */
export function EmailReceiver({
  giftId,
  manageKey,
  recipientName,
}: {
  giftId: string;
  manageKey: string;
  recipientName?: string;
}) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    setMessage('');
    try {
      const res = await fetch(`/api/gifts/${encodeURIComponent(giftId)}/email-receiver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: manageKey, email }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setState('error');
        setMessage(json.error || 'Couldn’t send. Try again.');
        return;
      }
      setState('sent');
      setMessage(
        recipientName
          ? `Sent to ${recipientName}'s inbox.`
          : 'Sent. They’ll get the gift link by email.',
      );
      setEmail('');
    } catch {
      setState('error');
      setMessage('Couldn’t reach the mail service. Try again.');
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mt-5 border-t border-dashed border-[#f0cfdc] pt-4"
      aria-label="Email the gift to them"
    >
      <p className="font-receipt text-[11px] uppercase tracking-[0.16em] text-[#b48799]">
        Or email it to them
      </p>
      <p className="mt-1 text-[13px] leading-snug text-[#6b4558]">
        Optional. We’ll send only their gift link — not your private dashboard.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor={`receiver-email-${giftId}`}>
          Their email
        </label>
        <input
          id={`receiver-email-${giftId}`}
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== 'idle' && state !== 'sending') setState('idle');
          }}
          placeholder="their@email.com"
          className="paper-field min-h-11 flex-1 font-receipt text-[14px]"
        />
        <button
          type="submit"
          disabled={state === 'sending' || !email.trim()}
          className="matte-cta inline-flex min-h-11 shrink-0 items-center justify-center rounded-full px-5 font-serif text-[16px] font-semibold disabled:opacity-50"
        >
          {state === 'sending' ? 'Sending…' : 'Email gift'}
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
