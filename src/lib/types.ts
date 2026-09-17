export type ThemeId = 'classic' | 'y2k' | 'cyber' | 'dark';

export type VibeId =
  | 'Chaotic Evil'
  | 'Wholesome'
  | 'Dramatic'
  | 'Unfiltered Bestie';

export interface LineItem {
  id: string;
  qty: string;
  description: string;
  price: string;
}

export interface BestieBillState {
  billerName: string;
  customerName: string;
  occasion: string;
  vibe: VibeId;
  insideJokes: string;
  merchantName: string;
  cashier: string;
  footerQuote: string;
  theme: ThemeId;
  lineItems: LineItem[];
  subtotal: string;
  emotionalTax: string;
  delusionTax: string;
  tipSuggestion: string;
  total: string;
  timestamp: string;
  barcodeId: string;
  isGenerating: boolean;
  error: string | null;
}

export interface GenerateBillResponse {
  merchant_name: string;
  cashier: string;
  line_items: Array<{
    qty: string;
    description: string;
    price: string;
  }>;
  subtotal: string;
  total: string;
  footer_quote: string;
}

export interface ThemeTokens {
  id: ThemeId;
  label: string;
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  grainOpacity: number;
}
