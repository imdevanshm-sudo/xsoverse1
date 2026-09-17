'use client';

import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { THEMES, VIBES } from '@/lib/constants';
import type { ThemeId, VibeId } from '@/lib/types';
import { useBillStore } from '@/store/useBillStore';

export function BillEditor() {
  const {
    billerName,
    customerName,
    occasion,
    vibe,
    insideJokes,
    merchantName,
    cashier,
    footerQuote,
    theme,
    lineItems,
    subtotal,
    total,
    emotionalTax,
    delusionTax,
    tipSuggestion,
    isGenerating,
    error,
    setField,
    setTheme,
    setVibe,
    addLineItem,
    updateLineItem,
    removeLineItem,
    moveLineItem,
    generateWithAi,
  } = useBillStore();

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SectionTitle>Identity</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Biller Name">
            <input
              className="field"
              value={billerName}
              onChange={(e) => setField('billerName', e.target.value)}
              placeholder="Sarah"
            />
          </Field>
          <Field label="Customer (Bestie)">
            <input
              className="field"
              value={customerName}
              onChange={(e) => setField('customerName', e.target.value)}
              placeholder="Alex"
            />
          </Field>
          <Field label="Occasion">
            <input
              className="field"
              value={occasion}
              onChange={(e) => setField('occasion', e.target.value)}
              placeholder="25th Birthday Roast"
            />
          </Field>
          <Field label="Vibe / Persona">
            <select
              className="field"
              value={vibe}
              onChange={(e) => setVibe(e.target.value as VibeId)}
            >
              {VIBES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Lore & Inside Jokes">
          <textarea
            className="field min-h-[96px] resize-y"
            value={insideJokes}
            onChange={(e) => setField('insideJokes', e.target.value)}
            placeholder="crying over exes, 2am boba, taking 45 mins to order food"
          />
        </Field>
        <button
          type="button"
          onClick={() => generateWithAi()}
          disabled={isGenerating}
          className="inline-flex w-full items-center justify-center gap-2 bg-acid px-4 py-3 font-display text-sm font-bold uppercase tracking-wide text-ink transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isGenerating ? 'Ringing up chaos…' : 'AI Generate Bill'}
        </button>
        {error ? (
          <p className="text-sm text-hotpink">{error}</p>
        ) : null}
      </section>

      <section className="space-y-3">
        <SectionTitle>Theme & Aesthetics</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(THEMES) as ThemeId[]).map((id) => {
            const t = THEMES[id];
            const active = theme === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                className={`border px-2 py-3 text-left transition ${
                  active
                    ? 'border-acid bg-white/10'
                    : 'border-white/15 bg-white/[0.03] hover:border-white/35'
                }`}
              >
                <span
                  className="mb-2 block h-8 w-full border border-white/10"
                  style={{ background: t.paper }}
                />
                <span className="font-display text-[11px] font-bold uppercase tracking-wide">
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Merchant Header">
            <input
              className="field"
              value={merchantName}
              onChange={(e) => setField('merchantName', e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Cashier">
            <input
              className="field"
              value={cashier}
              onChange={(e) => setField('cashier', e.target.value)}
            />
          </Field>
          <Field label="Footer Quote" className="sm:col-span-2">
            <input
              className="field"
              value={footerQuote}
              onChange={(e) => setField('footerQuote', e.target.value.toUpperCase())}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle>Line Items</SectionTitle>
          <button
            type="button"
            onClick={addLineItem}
            className="inline-flex items-center gap-1 border border-white/20 px-2 py-1 font-display text-[11px] font-bold uppercase tracking-wide hover:border-acid hover:text-acid"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>

        <div className="space-y-2">
          {lineItems.map((item, index) => (
            <div
              key={item.id}
              className="grid gap-2 border border-white/10 bg-white/[0.03] p-2 sm:grid-cols-[4.5rem_1fr_5.5rem_auto]"
            >
              <input
                className="field !py-2"
                value={item.qty}
                onChange={(e) => updateLineItem(item.id, { qty: e.target.value })}
                aria-label={`Quantity ${index + 1}`}
              />
              <input
                className="field !py-2 uppercase"
                maxLength={28}
                value={item.description}
                onChange={(e) =>
                  updateLineItem(item.id, { description: e.target.value })
                }
                aria-label={`Description ${index + 1}`}
              />
              <input
                className="field !py-2"
                value={item.price}
                onChange={(e) => updateLineItem(item.id, { price: e.target.value })}
                aria-label={`Price ${index + 1}`}
              />
              <div className="flex items-center justify-end gap-1">
                <IconBtn
                  label="Move up"
                  onClick={() => moveLineItem(item.id, 'up')}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn
                  label="Move down"
                  onClick={() => moveLineItem(item.id, 'down')}
                  disabled={index === lineItems.length - 1}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </IconBtn>
                <IconBtn
                  label="Delete"
                  onClick={() => removeLineItem(item.id)}
                  danger
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </IconBtn>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Subtotal">
            <input
              className="field"
              value={subtotal}
              onChange={(e) => setField('subtotal', e.target.value)}
            />
          </Field>
          <Field label="Total">
            <input
              className="field"
              value={total}
              onChange={(e) => setField('total', e.target.value)}
            />
          </Field>
          <Field label="Emotional Tax">
            <input
              className="field"
              value={emotionalTax}
              onChange={(e) => setField('emotionalTax', e.target.value)}
            />
          </Field>
          <Field label="Delusion Tax">
            <input
              className="field"
              value={delusionTax}
              onChange={(e) => setField('delusionTax', e.target.value)}
            />
          </Field>
          <Field label="Tip Suggestion" className="sm:col-span-2">
            <input
              className="field"
              value={tipSuggestion}
              onChange={(e) => setField('tipSuggestion', e.target.value)}
            />
          </Field>
        </div>
      </section>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-display text-lg font-bold uppercase tracking-tight text-white">
      {children}
    </h2>
  );
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className="text-[11px] uppercase tracking-[0.14em] text-white/55">
        {label}
      </span>
      {children}
    </label>
  );
}

function IconBtn({
  children,
  onClick,
  label,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`border p-1.5 disabled:opacity-30 ${
        danger
          ? 'border-hotpink/40 text-hotpink hover:bg-hotpink/10'
          : 'border-white/20 hover:border-white/50'
      }`}
    >
      {children}
    </button>
  );
}
