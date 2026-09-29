/** "CODE: BESTIE-4-LIFE • One free emergency pep talk" → code + perk. */
export function splitReward(reward: string): { code: string; perk: string } {
  const [first, ...rest] = reward.split('•');
  const code = (first ?? '').replace(/^\s*code\s*:\s*/i, '').trim();
  const perk = rest.join('•').trim();
  return perk ? { code, perk } : { code: '', perk: reward.trim() };
}

export function joinReward(code: string, perk: string): string {
  const cleanCode = code.trim();
  const cleanPerk = perk.trim();
  if (!cleanCode) return cleanPerk;
  return cleanPerk ? `CODE: ${cleanCode} • ${cleanPerk}` : `CODE: ${cleanCode}`;
}
