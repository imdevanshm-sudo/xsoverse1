import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    merchant_name: { type: 'string' },
    cashier: { type: 'string' },
    line_items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          qty: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'string' },
        },
        required: ['qty', 'description', 'price'],
      },
    },
    subtotal: { type: 'string' },
    total: { type: 'string' },
    footer_quote: { type: 'string' },
  },
  required: [
    'merchant_name',
    'cashier',
    'line_items',
    'subtotal',
    'total',
    'footer_quote',
  ],
};

function fallbackBill(body: {
  biller_name?: string;
  customer_name?: string;
  occasion?: string;
  vibe?: string;
  inside_jokes?: string;
}) {
  const jokes = (body.inside_jokes || 'boba, chaos')
    .split(/[,;/|]+/)
    .map((j) => j.trim())
    .filter(Boolean)
    .slice(0, 4);

  const jokeItems = jokes.map((joke, i) => ({
    qty: `${(i + 2) * 7}x`,
    description: `LORE: ${joke}`.toUpperCase().slice(0, 28),
    price: ['$13.00', 'CHAOS', 'UNPAID', '∞'][i % 4],
  }));

  return {
    merchant_name: 'CHAOTIC BESTIES INC.',
    cashier: body.vibe?.includes('Wholesome') ? 'Vibe Check' : 'Trauma Bonding',
    line_items: [
      ...jokeItems,
      {
        qty: '1',
        description: `${(body.occasion || 'FRIENDSHIP').toUpperCase()} TAX`.slice(0, 28),
        price: 'SPECIAL',
      },
      { qty: '150h', description: 'BEING YOUR THERAPIST', price: 'UNPAID' },
      { qty: '42x', description: 'DECIDING WHERE TO EAT', price: 'PAIN' },
      { qty: '∞', description: 'SOFT LAUNCH LOYALTY', price: 'FOREVER' },
    ].slice(0, 10),
    subtotal: '$420.00 + CHAOS',
    total: 'PRICELESS',
    footer_quote: `FROM ${(body.biller_name || 'BESTIE').toUpperCase()} WITH CHAOS`,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    biller_name = 'Anonymous',
    customer_name = 'Bestie',
    occasion = 'Friendship Tariff',
    vibe = 'Chaotic Evil',
    inside_jokes = '',
  } = body;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      ...fallbackBill(body),
      _meta: { source: 'fallback', reason: 'GEMINI_API_KEY missing' },
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Generate a complete Bestie Bill receipt for ${customer_name} from ${biller_name} for ${occasion}.
Incorporate these inside jokes: ${inside_jokes || 'none provided'}.
Keep the vibe: ${vibe}.
Rules:
- merchant_name: punny friendship store name in ALL CAPS
- cashier: short funny role like "Trauma Bonding" or "Vibe Check"
- Generate 6-10 line_items
- Each description MUST be UPPERCASE and MAX 28 characters
- qty can be like "42x", "150h", "∞"
- price can be money OR chaotic units like "PRICELESS", "CHAOS", "UNPAID"
- total should be "$∞", "PRICELESS", or "1x LIFETIME SUB"
- footer_quote: punchy receipt footer, ALL CAPS
Be chaotic, funny, self-deprecating, ultra-relatable.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: RESPONSE_SCHEMA,
        temperature: 1.1,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('Empty model response');
    }

    const parsed = JSON.parse(text);
    return NextResponse.json({ ...parsed, _meta: { source: 'gemini-2.5-flash' } });
  } catch (error) {
    console.error('[generate-bill]', error);
    return NextResponse.json({
      ...fallbackBill(body),
      _meta: {
        source: 'fallback',
        reason: error instanceof Error ? error.message : 'Gemini request failed',
      },
    });
  }
}
