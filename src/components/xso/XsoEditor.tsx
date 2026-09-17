'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { useXsoStore } from '@/store/useXsoStore';
import type { AuditMetrics } from '@/types/xso';
import { StudioStylePicker } from '@/components/xso/StudioStylePicker';

const TABS = [
  { id: 'lore', label: '1. Lore & Names' },
  { id: 'lines', label: '2. Line Items' },
  { id: 'audit', label: '3. Audit Stats & Flags' },
  { id: 'letter', label: '4. Photos & Letter' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const METRIC_LABELS: Record<keyof AuditMetrics, string> = {
  chaos: 'Chaos',
  loyalty: 'Loyalty',
  snacking: 'Snacking',
  advice: 'Bad Advice',
  support: 'Emotional Support',
};

export function XsoEditor({ showStylePicker = false }: { showStylePicker?: boolean }) {
  const [tab, setTab] = useState<TabId>('lore');
  const store = useXsoStore();

  return (
    <div className="space-y-xso-4">
      {showStylePicker ? <StudioStylePicker /> : null}

      <div
        className="flex flex-wrap gap-1 rounded-xso-panel bg-white/[0.04] p-1"
        role="tablist"
        aria-label="Editor sections"
      >
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={`rounded-xso-control px-2.5 py-2 text-left text-[11px] font-medium transition-colors sm:text-xs ${
                active
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-white/55 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="xso-panel">
        {tab === 'lore' && <LoreTab store={store} />}
        {tab === 'lines' && <LinesTab store={store} />}
        {tab === 'audit' && <AuditTab store={store} />}
        {tab === 'letter' && <LetterTab store={store} />}
      </div>
    </div>
  );
}

type Store = ReturnType<typeof useXsoStore.getState>;

function LoreTab({ store }: { store: Store }) {
  return (
    <div className="space-y-3">
      <SectionTitle>Lore & Names</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Biller Name">
          <input
            className="field"
            value={store.billerName}
            onChange={(e) => store.setField('billerName', e.target.value)}
          />
        </Field>
        <Field label="Customer">
          <input
            className="field"
            value={store.customerName}
            onChange={(e) => store.setField('customerName', e.target.value)}
          />
        </Field>
        <Field label="Occasion">
          <input
            className="field"
            value={store.occasion}
            onChange={(e) => store.setField('occasion', e.target.value)}
          />
        </Field>
        <Field label="Timestamp">
          <input
            className="field"
            value={store.timestamp}
            onChange={(e) => store.setField('timestamp', e.target.value)}
          />
        </Field>
        <Field label="Merchant Name">
          <input
            className="field"
            value={store.merchantName}
            onChange={(e) => store.setField('merchantName', e.target.value)}
          />
        </Field>
        <Field label="Cashier">
          <input
            className="field"
            value={store.cashier}
            onChange={(e) => store.setField('cashier', e.target.value)}
          />
        </Field>
        <Field label="Certified Stamp Text" className="sm:col-span-2">
          <input
            className="field"
            value={store.certifiedStampText}
            onChange={(e) => store.setField('certifiedStampText', e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

function LinesTab({ store }: { store: Store }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>Line Items</SectionTitle>
        <button
          type="button"
          onClick={store.addLineItem}
          className="inline-flex items-center gap-1.5 rounded-lg border border-acid/40 bg-acid/10 px-3 py-1.5 text-xs font-semibold text-acid"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      <ul className="m-0 list-none space-y-3 p-0">
        {store.lineItems.map((item, index) => (
          <li
            key={item.id}
            className="grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3 sm:grid-cols-[4rem_1fr_5rem_auto]"
          >
            <Field label="Qty">
              <input
                className="field"
                value={item.qty}
                onChange={(e) =>
                  store.updateLineItem(item.id, { qty: e.target.value })
                }
              />
            </Field>
            <Field label="Description">
              <input
                className="field"
                value={item.description}
                onChange={(e) =>
                  store.updateLineItem(item.id, { description: e.target.value })
                }
              />
            </Field>
            <Field label="Price">
              <input
                className="field"
                value={item.price}
                onChange={(e) =>
                  store.updateLineItem(item.id, { price: e.target.value })
                }
              />
            </Field>
            <div className="flex items-end gap-1">
              <IconBtn
                label="Move up"
                disabled={index === 0}
                onClick={() => store.moveLineItem(item.id, 'up')}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn
                label="Move down"
                disabled={index === store.lineItems.length - 1}
                onClick={() => store.moveLineItem(item.id, 'down')}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </IconBtn>
              <IconBtn
                label="Delete"
                onClick={() => store.removeLineItem(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </IconBtn>
            </div>
          </li>
        ))}
      </ul>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Subtotal">
          <input
            className="field"
            value={store.subtotal}
            onChange={(e) => store.setField('subtotal', e.target.value)}
          />
        </Field>
        <Field label="Emotional Tax">
          <input
            className="field"
            value={store.emotionalTax}
            onChange={(e) => store.setField('emotionalTax', e.target.value)}
          />
        </Field>
        <Field label="Total">
          <input
            className="field"
            value={store.total}
            onChange={(e) => store.setField('total', e.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}

function AuditTab({ store }: { store: Store }) {
  return (
    <div className="space-y-5">
      <SectionTitle>Audit Stats</SectionTitle>
      <ul className="m-0 list-none space-y-3 p-0">
        {(Object.keys(METRIC_LABELS) as (keyof AuditMetrics)[]).map((key) => (
          <li key={key}>
            <div className="mb-1 flex justify-between font-mono text-[11px] uppercase tracking-wide text-white/70">
              <span>{METRIC_LABELS[key]}</span>
              <span>{store.auditMetrics[key]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={store.auditMetrics[key]}
              onChange={(e) => store.setAuditMetric(key, Number(e.target.value))}
              className="w-full accent-hotpink"
            />
          </li>
        ))}
      </ul>

      <FlagEditor
        title="Green Flags"
        kind="greenFlags"
        items={store.greenFlags}
        onAdd={() => store.addFlag('greenFlags')}
        onUpdate={(i, v) => store.updateFlag('greenFlags', i, v)}
        onRemove={(i) => store.removeFlag('greenFlags', i)}
      />
      <FlagEditor
        title="Red Flags"
        kind="redFlags"
        items={store.redFlags}
        onAdd={() => store.addFlag('redFlags')}
        onUpdate={(i, v) => store.updateFlag('redFlags', i, v)}
        onRemove={(i) => store.removeFlag('redFlags', i)}
      />
    </div>
  );
}

function LetterTab({ store }: { store: Store }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>Photos</SectionTitle>
        <button
          type="button"
          onClick={() => store.addPhoto()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-acid/40 bg-acid/10 px-3 py-1.5 text-xs font-semibold text-acid"
        >
          <Plus className="h-3.5 w-3.5" />
          Add photo
        </button>
      </div>
      <ul className="m-0 list-none space-y-2 p-0">
        {store.photos.map((url, index) => (
          <li key={`photo-${index}`} className="flex gap-2">
            <input
              className="field"
              value={url}
              onChange={(e) => store.updatePhoto(index, e.target.value)}
              placeholder="Image URL or data URI"
            />
            <IconBtn label="Remove photo" onClick={() => store.removePhoto(index)}>
              <Trash2 className="h-3.5 w-3.5" />
            </IconBtn>
          </li>
        ))}
      </ul>

      <Field label="Birthday Message">
        <textarea
          className="field min-h-[120px] resize-y"
          value={store.birthdayMessage}
          onChange={(e) => store.setField('birthdayMessage', e.target.value)}
        />
      </Field>
      <Field label="Voice Note URL (optional)">
        <input
          className="field"
          value={store.voiceNoteUrl ?? ''}
          onChange={(e) =>
            store.setField('voiceNoteUrl', e.target.value || undefined)
          }
          placeholder="https://..."
        />
      </Field>
      <Field label="Scratch-off Reward">
        <input
          className="field"
          value={store.scratchOffReward}
          onChange={(e) => store.setField('scratchOffReward', e.target.value)}
        />
      </Field>
    </div>
  );
}

function FlagEditor({
  title,
  items,
  onAdd,
  onUpdate,
  onRemove,
}: {
  title: string;
  kind: 'greenFlags' | 'redFlags';
  items: string[];
  onAdd: () => void;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle>{title}</SectionTitle>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 text-xs text-acid"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
      <ul className="m-0 list-none space-y-2 p-0">
        {items.map((item, index) => (
          <li key={`${title}-${index}`} className="flex gap-2">
            <input
              className="field"
              value={item}
              onChange={(e) => onUpdate(index, e.target.value)}
            />
            <IconBtn label={`Remove ${title}`} onClick={() => onRemove(index)}>
              <Trash2 className="h-3.5 w-3.5" />
            </IconBtn>
          </li>
        ))}
      </ul>
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
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-lg border border-white/15 text-white/70 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
