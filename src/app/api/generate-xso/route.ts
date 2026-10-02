import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import type { CraftResponse, QuestionsResponse } from '@/lib/aiCraft';
import {
  craftPrompt,
  craftSchema,
  normalizeQuestions,
  normalizeStory,
  parseCraftInput,
  parseQuestionsInput,
  questionsPrompt,
  questionsSchema,
  templateQuestions,
  templateStory,
} from '@/lib/aiCraftServer';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MODEL = 'gemini-2.5-flash';
const TIMEOUT_MS = 22_000;
const QUESTIONS_TIMEOUT_MS = 12_000;
const MAX_BODY = 4_000;

/** Best-effort per-instance throttle; each call costs a model request. */
const WINDOW_MS = 10 * 60_000;
const LIMITS = { story: 12, questions: 30 } as const;
type Bucket = keyof typeof LIMITS;
const hits = new Map<string, { count: number; reset: number }>();

function throttled(ip: string, bucket: Bucket) {
  const now = Date.now();
  if (hits.size > 5_000) {
    hits.forEach((v, k) => {
      if (v.reset < now) hits.delete(k);
    });
  }
  const key = `${bucket}:${ip}`;
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > LIMITS[bucket];
}

async function generateJson(
  apiKey: string,
  contents: string,
  schema: object,
  temperature: number,
  timeout: number,
) {
  const ai = new GoogleGenAI({ apiKey });
  const response = await Promise.race([
    ai.models.generateContent({
      model: MODEL,
      contents,
      config: { responseMimeType: 'application/json', responseJsonSchema: schema, temperature },
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Model timed out')), timeout),
    ),
  ]);
  const raw = response.text;
  if (!raw) throw new Error('Empty model response');
  return JSON.parse(raw) as unknown;
}

export async function POST(req: NextRequest) {
  const text = await req.text().catch(() => '');
  if (text.length > MAX_BODY) {
    return NextResponse.json({ error: 'Too long. Trim your memories a little.' }, { status: 413 });
  }
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    // handled by the parsers
  }
  const mode: Bucket =
    (body as { mode?: unknown } | null)?.mode === 'questions' ? 'questions' : 'story';

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (throttled(ip, mode)) {
    return NextResponse.json(
      { error: 'That’s a lot of magic. Give it a few minutes and try again.' },
      { status: 429 },
    );
  }
  const apiKey = process.env.GEMINI_API_KEY;

  if (mode === 'questions') {
    const input = parseQuestionsInput(body);
    if (typeof input === 'string') return NextResponse.json({ error: input }, { status: 400 });
    if (!apiKey) {
      return NextResponse.json<QuestionsResponse>({
        questions: templateQuestions(input),
        source: 'template',
      });
    }
    try {
      const raw = await generateJson(
        apiKey,
        questionsPrompt(input),
        questionsSchema,
        1.2,
        QUESTIONS_TIMEOUT_MS,
      );
      return NextResponse.json<QuestionsResponse>({
        questions: normalizeQuestions(raw, input),
        source: 'ai',
      });
    } catch (error) {
      console.error('[generate-xso:questions]', error instanceof Error ? error.message : error);
      return NextResponse.json<QuestionsResponse>({
        questions: templateQuestions(input),
        source: 'template',
      });
    }
  }

  const input = parseCraftInput(body);
  if (typeof input === 'string') {
    return NextResponse.json({ error: input }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json<CraftResponse>({ story: templateStory(input), source: 'template' });
  }
  try {
    const raw = await generateJson(
      apiKey,
      craftPrompt(input),
      craftSchema(input),
      input.adjust ? 1.15 : 1,
      TIMEOUT_MS,
    );
    return NextResponse.json<CraftResponse>({ story: normalizeStory(raw, input), source: 'ai' });
  } catch (error) {
    console.error('[generate-xso]', error instanceof Error ? error.message : error);
    return NextResponse.json<CraftResponse>({ story: templateStory(input), source: 'template' });
  }
}
