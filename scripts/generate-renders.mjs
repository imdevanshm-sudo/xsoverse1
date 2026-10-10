import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'public/renders');
const ARTIFACT_DIR = '/Users/devansh/.gemini/antigravity/brain/42a0ae3b-559e-48ca-a9b3-0380b03aaaac';

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(ARTIFACT_DIR, { recursive: true });

const FONTS_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Fraunces:ital,opsz,wght@0,9..144,400..800;1,9..144,400..800&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap');

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  width: 1600px;
  height: 1200px;
  overflow: hidden;
  font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  color: #fff;
  background: #140810;
  -webkit-font-smoothing: antialiased;
}

.font-serif { font-family: 'Fraunces', Georgia, serif; }
.font-mono { font-family: 'Space Mono', 'Courier Prime', monospace; }
.font-hand { font-family: 'Caveat', cursive; }
.font-receipt { font-family: 'Courier Prime', 'Space Mono', monospace; }

.noise-overlay {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255,255,255,0.07) 1px, transparent 0);
  background-size: 20px 20px;
  pointer-events: none;
  opacity: 0.6;
}
`;

// ==========================================
// 01. FIVE FORMATS TOGETHER
// ==========================================
const HTML_FIVE_FORMATS = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${FONTS_CSS}

.stage {
  width: 1600px;
  height: 1200px;
  background: radial-gradient(circle at 50% 20%, #301123 0%, #150612 55%, #0a0208 100%);
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 44px 64px;
}

.header {
  text-align: center;
  margin-bottom: 20px;
}

.brand-pill {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 6px 20px;
  border-radius: 999px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.14);
  margin-bottom: 12px;
}

.brand-logo {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #fdf2f8;
}

.brand-tag {
  font-size: 11px;
  letter-spacing: 0.22em;
  color: #f472b6;
  font-weight: 700;
  text-transform: uppercase;
}

.main-title {
  font-size: 46px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: #fdf2f8;
  line-height: 1.1;
  margin-bottom: 8px;
}

.main-title em {
  font-style: italic;
  color: #f9a8d4;
  font-weight: 500;
}

.cta-wrap {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 18px;
  margin-bottom: 26px;
}

.cta-button {
  background: linear-gradient(135deg, #f472b6 0%, #ec4899 50%, #db2777 100%);
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  padding: 12px 36px;
  border-radius: 999px;
  box-shadow: 0 10px 30px rgba(236, 72, 153, 0.45), inset 0 1px 0 rgba(255,255,255,0.35);
  border: none;
  letter-spacing: 0.02em;
}

.cta-hint {
  font-size: 12px;
  color: #c99aae;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.grid-container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 350px 240px;
  gap: 20px;
  flex: 1;
}

.card {
  position: relative;
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.12);
  background: linear-gradient(160deg, var(--card-tint), rgba(20, 9, 16, 0.95) 75%);
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15);
}

.card.span-2 {
  grid-column: span 2;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.card-title {
  font-size: 23px;
  font-weight: 600;
  color: #fdf2f8;
  letter-spacing: -0.01em;
}

.card-blurb {
  font-size: 13.5px;
  color: var(--accent-color);
  margin-top: 3px;
  font-weight: 500;
}

.card-tag {
  font-size: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.1);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: #fdf2f8;
}

.card-visual {
  flex: 1;
  border-radius: 16px;
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.08);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Card 1: Loop phone visual */
.vis-loop {
  background: radial-gradient(circle at center, #3b1828, #160811);
}
.phone-mini {
  width: 170px;
  height: 215px;
  background: #0d040a;
  border: 3.5px solid #f472b6;
  border-radius: 24px;
  box-shadow: 0 15px 35px rgba(244,114,182,0.35);
  display: flex;
  flex-direction: column;
  padding: 10px;
  align-items: center;
}
.phone-screen {
  width: 100%;
  height: 125px;
  background: linear-gradient(145deg, #f43f5e 0%, #ec4899 50%, #8b5cf6 100%);
  border-radius: 14px;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 0 20px rgba(0,0,0,0.3);
}
.loop-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  background: rgba(0,0,0,0.6);
  padding: 3px 8px;
  border-radius: 999px;
  font-family: 'Space Mono';
  font-size: 8px;
  color: #fff;
}
.loop-caption {
  position: absolute;
  bottom: 6px;
  left: 8px;
  font-family: 'Caveat';
  font-size: 14px;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,0.6);
}
.waveform {
  display: flex;
  gap: 3px;
  align-items: center;
  height: 26px;
  margin-top: 10px;
}
.waveform span {
  width: 3.5px;
  background: #f472b6;
  border-radius: 2px;
}

/* Card 2: Rewind VHS */
.vis-rewind {
  background: radial-gradient(circle at center, #1e1b4b, #0c0a1a);
}
.vhs-cassette {
  width: 260px;
  height: 155px;
  background: #141420;
  border: 2px solid #6366f1;
  border-radius: 12px;
  box-shadow: 0 15px 35px rgba(99, 102, 241, 0.4);
  position: relative;
  padding: 14px;
}
.vhs-label {
  background: #f8fafc;
  color: #0f172a;
  height: 52px;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-left: 6px solid #ef4444;
}
.vhs-spools {
  display: flex;
  justify-content: space-around;
  margin-top: 18px;
  align-items: center;
}
.vhs-spool {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #09090b;
  border: 4px dashed #818cf8;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #818cf8;
  font-size: 10px;
}

/* Card 3: Scrapbook */
.vis-scrapbook {
  background: radial-gradient(circle at center, #38281a, #16100a);
}
.scrapbook-flat {
  position: relative;
  width: 260px;
  height: 180px;
}
.mini-polaroid {
  position: absolute;
  top: 10px;
  left: 20px;
  width: 120px;
  height: 145px;
  background: #fffdfa;
  border-radius: 4px;
  padding: 8px 8px 24px 8px;
  box-shadow: 0 12px 25px rgba(0,0,0,0.5);
  transform: rotate(-8deg);
}
.mini-polaroid-photo {
  width: 100%;
  height: 90px;
  background: linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #ec4899 100%);
  border-radius: 2px;
}
.mini-sticky {
  position: absolute;
  top: 35px;
  right: 15px;
  width: 105px;
  height: 105px;
  background: #fef08a;
  color: #713f12;
  box-shadow: 0 10px 20px rgba(0,0,0,0.4);
  transform: rotate(12deg);
  padding: 12px;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
}

/* Card 4: Accordion */
.vis-accordion {
  background: radial-gradient(circle at center, #381e18, #180c08);
}
.accordion-stack {
  display: flex;
  align-items: center;
  perspective: 700px;
}
.acc-panel {
  width: 90px;
  height: 135px;
  background: #fff7fb;
  border: 1px solid #d4c5b9;
  border-radius: 6px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  margin-right: -24px;
  padding: 8px;
  color: #262626;
  font-size: 9px;
  transform: rotateY(-20deg) rotateZ(-3deg);
  display: flex;
  flex-direction: column;
}
.acc-pull {
  width: 40px;
  height: 80px;
  background: linear-gradient(135deg, #a56b58, #7a4a3c);
  border-radius: 0 8px 8px 0;
  border: 1.5px solid #c48b78;
  color: #fff;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 4px 6px 15px rgba(0,0,0,0.4);
  writing-mode: vertical-rl;
  letter-spacing: 0.12em;
  font-weight: 700;
  margin-left: 6px;
}

/* Card 5: Movie Box */
.vis-moviebox {
  background: radial-gradient(circle at center, #1c2a38, #09121c);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 36px;
}
.film-strip {
  display: flex;
  gap: 14px;
  background: #0b1322;
  padding: 12px 18px;
  border-radius: 10px;
  border: 2px solid #38bdf8;
  box-shadow: 0 15px 35px rgba(56, 189, 248, 0.35);
}
.film-frame {
  width: 110px;
  height: 80px;
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}
.film-frame.f1 { background: linear-gradient(135deg, #ec4899, #8b5cf6); }
.film-frame.f2 { background: linear-gradient(135deg, #3b82f6, #06b6d4); }
.film-frame.f3 { background: linear-gradient(135deg, #10b981, #3b82f6); }
.film-frame.f4 { background: linear-gradient(135deg, #f59e0b, #ef4444); }

.movie-meta {
  color: #93c5fd;
  font-size: 13px;
  font-family: 'Space Mono';
  line-height: 1.8;
}
</style>
</head>
<body>
<div class="stage">
  <div class="noise-overlay"></div>

  <div class="header">
    <div class="brand-pill">
      <span class="brand-logo font-serif">XSO</span>
      <span style="color: #6b394e;">|</span>
      <span class="brand-tag font-mono">XSOVERSE STOREFRONT</span>
    </div>
    <h1 class="main-title font-serif">Keepsakes for the words <em>you never said.</em></h1>
  </div>

  <div class="cta-wrap">
    <button class="cta-button font-serif">Make yours ✦</button>
    <span class="cta-hint font-mono">Ready in 60s · 5 bespoke souvenir formats</span>
  </div>

  <div class="grid-container">
    <!-- Card 1: The Loop -->
    <div class="card" style="--card-tint: rgba(244, 114, 182, 0.15); --accent-color: #f472b6;">
      <div class="card-top">
        <div>
          <h2 class="card-title font-serif">The Loop</h2>
          <p class="card-blurb">Nostalgia on repeat.</p>
        </div>
        <span class="card-tag font-mono">01</span>
      </div>
      <div class="card-visual vis-loop">
        <div class="phone-mini">
          <div class="phone-screen">
            <div class="loop-badge">OCT 24 · 2:15 AM</div>
            <div class="loop-caption">"dancing in the kitchen"</div>
          </div>
          <div class="waveform">
            <span style="height: 8px;"></span>
            <span style="height: 16px;"></span>
            <span style="height: 24px;"></span>
            <span style="height: 14px;"></span>
            <span style="height: 22px;"></span>
            <span style="height: 10px;"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Card 2: The Rewind -->
    <div class="card" style="--card-tint: rgba(99, 102, 241, 0.15); --accent-color: #a5b4fc;">
      <div class="card-top">
        <div>
          <h2 class="card-title font-serif">The Rewind</h2>
          <p class="card-blurb">Play it back.</p>
        </div>
        <span class="card-tag font-mono">02</span>
      </div>
      <div class="card-visual vis-rewind">
        <div class="vhs-cassette">
          <div class="vhs-label font-mono">
            <span>MIXTAPE '24</span>
            <span style="color: #22c55e;">PLAY ▶</span>
          </div>
          <div class="vhs-spools">
            <div class="vhs-spool">⟲</div>
            <div style="font-family: 'Space Mono'; font-size: 10px; color: #a5b4fc;">03:42</div>
            <div class="vhs-spool">⟳</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Card 3: The Scrapbook -->
    <div class="card" style="--card-tint: rgba(245, 158, 11, 0.15); --accent-color: #fcd34d;">
      <div class="card-top">
        <div>
          <h2 class="card-title font-serif">The Scrapbook</h2>
          <p class="card-blurb">We kept the receipts.</p>
        </div>
        <span class="card-tag font-mono">03</span>
      </div>
      <div class="card-visual vis-scrapbook">
        <div class="scrapbook-flat">
          <div class="mini-polaroid">
            <div class="mini-polaroid-photo"></div>
            <div class="font-hand" style="color: #1c1917; font-size: 15px; margin-top: 4px; text-align: center;">golden hour</div>
          </div>
          <div class="mini-sticky font-hand">
            secret lore 🔒<br>
            <span style="font-size: 12px; font-weight: normal;">reveal on peel</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Card 4: The Accordion -->
    <div class="card" style="--card-tint: rgba(234, 88, 12, 0.15); --accent-color: #fdba74;">
      <div class="card-top">
        <div>
          <h2 class="card-title font-serif">The Accordion</h2>
          <p class="card-blurb">Let it unfold.</p>
        </div>
        <span class="card-tag font-mono">04</span>
      </div>
      <div class="card-visual vis-accordion">
        <div class="accordion-stack">
          <div class="acc-panel">
            <div style="height: 60px; background: #fb7185; border-radius: 2px; margin-bottom: 4px;"></div>
            <span style="font-family: 'Caveat'; font-size: 12px;">road trip '23</span>
          </div>
          <div class="acc-panel">
            <div style="font-weight: 700; font-size: 8px;">RECEIPT</div>
            <div style="font-size: 7px; margin-top: 4px;">TOTAL: $0.00</div>
          </div>
          <div class="acc-panel">
            <div style="font-family: 'Caveat'; font-size: 11px;">"always with you"</div>
          </div>
          <div class="acc-pull font-mono">PULL</div>
        </div>
      </div>
    </div>

    <!-- Card 5: The Movie Box (Span 2) -->
    <div class="card span-2" style="--card-tint: rgba(56, 189, 248, 0.15); --accent-color: #7dd3fc;">
      <div class="card-top">
        <div>
          <h2 class="card-title font-serif">The Movie Box</h2>
          <p class="card-blurb">Frame by frame · 8mm Projector Memories</p>
        </div>
        <span class="card-tag font-mono">05 · FEATURE</span>
      </div>
      <div class="card-visual vis-moviebox">
        <div class="film-strip">
          <div class="film-frame f1">
            <div style="padding: 6px; font-size: 8px; color: #fff; font-family: 'Space Mono';">FRAME 01</div>
          </div>
          <div class="film-frame f2">
            <div style="padding: 6px; font-size: 8px; color: #fff; font-family: 'Space Mono';">FRAME 02</div>
          </div>
          <div class="film-frame f3">
            <div style="padding: 6px; font-size: 8px; color: #fff; font-family: 'Space Mono';">FRAME 03</div>
          </div>
          <div class="film-frame f4">
            <div style="padding: 6px; font-size: 8px; color: #fff; font-family: 'Space Mono';">FRAME 04</div>
          </div>
        </div>
        <div class="movie-meta">
          ✦ REEL SPEED: 24 FPS<br>
          ✦ SOUNDTRACK: SYNCHRONIZED<br>
          ✦ FORMAT: SUPER 8 COLLECTOR
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>
`;

// ==========================================
// 02. THERMAL RECEIPT HERO SHOT
// ==========================================
const HTML_RECEIPT = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${FONTS_CSS}

.stage {
  width: 1600px;
  height: 1200px;
  background: radial-gradient(circle at 50% 25%, #2d0e20 0%, #170712 50%, #0a0208 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bokeh-glow {
  position: absolute;
  width: 750px;
  height: 750px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(244, 114, 182, 0.22) 0%, rgba(244, 114, 182, 0) 70%);
  filter: blur(90px);
}

.receipt-shadow {
  position: absolute;
  width: 500px;
  height: 940px;
  background: rgba(0,0,0,0.75);
  filter: blur(45px);
  transform: rotate(-2.5deg) translateY(35px);
}

.receipt-wrap {
  position: relative;
  width: 500px;
  transform: rotate(-2deg);
  z-index: 10;
}

.receipt-paper {
  background: #fff7fb;
  color: #1a1a1a;
  padding: 48px 42px 52px 42px;
  font-family: 'Courier Prime', monospace;
  font-size: 13.5px;
  line-height: 1.45;
  text-transform: uppercase;
  position: relative;
  box-shadow: 0 30px 70px rgba(0,0,0,0.55), inset 0 0 50px rgba(230, 200, 215, 0.4);
  clip-path: polygon(
    0% 10px, 2.5% 0, 5% 10px, 7.5% 0, 10% 10px, 12.5% 0, 15% 10px, 17.5% 0, 20% 10px, 22.5% 0, 25% 10px, 27.5% 0, 30% 10px, 32.5% 0, 35% 10px, 37.5% 0, 40% 10px, 42.5% 0, 45% 10px, 47.5% 0, 50% 10px, 52.5% 0, 55% 10px, 57.5% 0, 60% 10px, 62.5% 0, 65% 10px, 67.5% 0, 70% 10px, 72.5% 0, 75% 10px, 77.5% 0, 80% 10px, 82.5% 0, 85% 10px, 87.5% 0, 90% 10px, 92.5% 0, 95% 10px, 97.5% 0, 100% 10px,
    100% calc(100% - 10px), 97.5% 100%, 95% calc(100% - 10px), 92.5% 100%, 90% calc(100% - 10px), 87.5% 100%, 85% calc(100% - 10px), 82.5% 100%, 80% calc(100% - 10px), 77.5% 100%, 75% calc(100% - 10px), 72.5% 100%, 70% calc(100% - 10px), 67.5% 100%, 65% calc(100% - 10px), 62.5% 100%, 60% calc(100% - 10px), 57.5% 100%, 55% calc(100% - 10px), 52.5% 100%, 50% calc(100% - 10px), 47.5% 100%, 45% calc(100% - 10px), 42.5% 100%, 40% calc(100% - 10px), 37.5% 100%, 35% calc(100% - 10px), 32.5% 100%, 30% calc(100% - 10px), 27.5% 100%, 25% calc(100% - 10px), 22.5% 100%, 20% calc(100% - 10px), 17.5% 100%, 15% calc(100% - 10px), 12.5% 100%, 10% calc(100% - 10px), 7.5% 100%, 5% calc(100% - 10px), 2.5% 100%, 0% calc(100% - 10px)
  );
}

.coffee-ring {
  position: absolute;
  bottom: 90px;
  left: 24px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 7px rgba(139, 90, 43, 0.22), inset 0 0 0 12px rgba(120, 72, 28, 0.12);
  background: radial-gradient(circle at 40% 35%, transparent 42%, rgba(139,90,43,0.08) 55%, transparent 68%);
  pointer-events: none;
  transform: rotate(-15deg);
}

.store-header {
  text-align: center;
  margin-bottom: 18px;
}
.store-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}
.store-subtitle {
  font-size: 11.5px;
  color: #555;
  letter-spacing: 0.06em;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #444;
  margin-bottom: 3.5px;
}

.dashed-line {
  border-top: 2px dashed #222;
  margin: 15px 0;
  opacity: 0.65;
}

.items-header {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #666;
  margin-bottom: 9px;
  font-weight: 700;
}

.line-item {
  display: grid;
  grid-template-columns: 3.5ch 1fr auto;
  gap: 6px;
  align-items: baseline;
  margin-bottom: 8px;
  font-size: 12.5px;
}

.leader-dots {
  border-bottom: 1px dotted #888;
  height: 1px;
  margin: 0 4px 3px 4px;
  flex: 1;
}

.item-desc-wrap {
  display: flex;
  align-items: baseline;
  overflow: hidden;
}

.totals-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 5px;
  font-size: 13.5px;
}

.grand-total {
  font-size: 19px;
  font-weight: 700;
  margin-top: 6px;
}

.barcode-wrap {
  margin: 24px 0 16px 0;
  text-align: center;
}

.barcode-svg {
  width: 100%;
  max-width: 360px;
  height: 50px;
}

.stamp-red {
  display: inline-block;
  border: 4px solid #d92d20;
  color: #d92d20;
  padding: 8px 26px;
  border-radius: 8px;
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 800;
  font-size: 18px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  transform: rotate(-10deg);
  box-shadow: inset 0 0 0 1.5px rgba(217, 45, 32, 0.3), 0 2px 12px rgba(217, 45, 32, 0.25);
  background: rgba(254, 226, 226, 0.2);
}

.tagline-footer {
  text-align: center;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #333;
  margin-top: 12px;
}

/* Background Callouts */
.floating-callout-left {
  position: absolute;
  left: 100px;
  top: 420px;
  max-width: 340px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(16px);
  padding: 24px 28px;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
}

.floating-callout-right {
  position: absolute;
  right: 100px;
  bottom: 380px;
  max-width: 340px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(16px);
  padding: 24px 28px;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
}
</style>
</head>
<body>
<div class="stage">
  <div class="noise-overlay"></div>
  <div class="bokeh-glow"></div>

  <!-- Left Callout -->
  <div class="floating-callout-left">
    <div class="font-mono" style="font-size: 11px; color: #f472b6; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 6px;">Visual Hero</div>
    <div class="font-serif" style="font-size: 28px; color: #fdf2f8; font-weight: 600; line-height: 1.2;">The Thermal Receipt</div>
    <div style="font-size: 14px; color: #c99aae; margin-top: 8px; line-height: 1.45;">
      Every memory, inside joke, and shared silence converted into a certified souvenir audit.
    </div>
  </div>

  <div class="receipt-shadow"></div>

  <div class="receipt-wrap">
    <div class="receipt-paper">
      <div class="coffee-ring"></div>

      <div class="store-header">
        <div style="font-size: 11px; letter-spacing: 0.22em; color: #ec4899; font-weight: 700; margin-bottom: 3px;">★ XSOVERSE SOUVENIR STUDIO ★</div>
        <div class="store-title">THE MEMORY LOUNGE</div>
        <div class="store-subtitle">SAN FRANCISCO, CA · LORE ARCHIVE #84920</div>
      </div>

      <div class="meta-row">
        <span>CASHIER: DEV & JAMIE</span>
        <span>REGISTER: 01</span>
      </div>
      <div class="meta-row">
        <span>CUSTOMER: FOR THE ONE WHO STAYED</span>
        <span>OCCASION: 2024</span>
      </div>
      <div class="meta-row">
        <span>TIMESTAMP: OCT 24 · 02:47 AM</span>
        <span>ORDER #9042</span>
      </div>

      <div class="dashed-line"></div>

      <div class="items-header">
        <span>QTY</span>
        <span>DESCRIPTION</span>
        <span>AMOUNT</span>
      </div>

      <div class="line-item">
        <span>1x</span>
        <div class="item-desc-wrap">
          <span>2:00 AM ROOFTOP TALK</span>
          <div class="leader-dots"></div>
        </div>
        <span>$0.00</span>
      </div>

      <div class="line-item">
        <span>1x</span>
        <div class="item-desc-wrap">
          <span>THAT SONG ON REPEAT</span>
          <div class="leader-dots"></div>
        </div>
        <span>$14.50</span>
      </div>

      <div class="line-item">
        <span>3x</span>
        <div class="item-desc-wrap">
          <span>ICED MATCHA IN THE RAIN</span>
          <div class="leader-dots"></div>
        </div>
        <span>$19.50</span>
      </div>

      <div class="line-item">
        <span>1x</span>
        <div class="item-desc-wrap">
          <span>UNFINISHED PLAYLIST</span>
          <div class="leader-dots"></div>
        </div>
        <span>$8.00</span>
      </div>

      <div class="line-item">
        <span>1x</span>
        <div class="item-desc-wrap">
          <span>PROMISE WE'D NEVER DRIFT</span>
          <div class="leader-dots"></div>
        </div>
        <span>$0.00</span>
      </div>

      <div class="line-item">
        <span>1x</span>
        <div class="item-desc-wrap">
          <span>LAST FLIGHT HOME</span>
          <div class="leader-dots"></div>
        </div>
        <span>$24.00</span>
      </div>

      <div class="dashed-line"></div>

      <div class="totals-row">
        <span>SUBTOTAL</span>
        <div class="leader-dots"></div>
        <span>$66.00</span>
      </div>
      <div class="totals-row">
        <span>EMOTIONAL TAX (+18%)</span>
        <div class="leader-dots"></div>
        <span>$11.88</span>
      </div>
      <div class="totals-row">
        <span>NOSTALGIA SURCHARGE</span>
        <div class="leader-dots"></div>
        <span>$4.20</span>
      </div>

      <div class="dashed-line"></div>

      <div class="totals-row grand-total">
        <span>TOTAL BALANCE</span>
        <div class="leader-dots"></div>
        <span>PRICELESS</span>
      </div>

      <div class="barcode-wrap">
        <svg class="barcode-svg" viewBox="0 0 280 40">
          <rect x="0" y="0" width="3" height="40" fill="#222" />
          <rect x="5" y="0" width="1" height="40" fill="#222" />
          <rect x="8" y="0" width="4" height="40" fill="#222" />
          <rect x="14" y="0" width="2" height="40" fill="#222" />
          <rect x="18" y="0" width="1" height="40" fill="#222" />
          <rect x="22" y="0" width="5" height="40" fill="#222" />
          <rect x="30" y="0" width="2" height="40" fill="#222" />
          <rect x="34" y="0" width="1" height="40" fill="#222" />
          <rect x="38" y="0" width="3" height="40" fill="#222" />
          <rect x="44" y="0" width="6" height="40" fill="#222" />
          <rect x="52" y="0" width="2" height="40" fill="#222" />
          <rect x="56" y="0" width="1" height="40" fill="#222" />
          <rect x="60" y="0" width="4" height="40" fill="#222" />
          <rect x="66" y="0" width="2" height="40" fill="#222" />
          <rect x="70" y="0" width="3" height="40" fill="#222" />
          <rect x="76" y="0" width="1" height="40" fill="#222" />
          <rect x="80" y="0" width="5" height="40" fill="#222" />
          <rect x="88" y="0" width="2" height="40" fill="#222" />
          <rect x="92" y="0" width="4" height="40" fill="#222" />
          <rect x="98" y="0" width="1" height="40" fill="#222" />
          <rect x="102" y="0" width="6" height="40" fill="#222" />
          <rect x="110" y="0" width="3" height="40" fill="#222" />
          <rect x="115" y="0" width="1" height="40" fill="#222" />
          <rect x="118" y="0" width="4" height="40" fill="#222" />
          <rect x="124" y="0" width="2" height="40" fill="#222" />
          <rect x="128" y="0" width="5" height="40" fill="#222" />
          <rect x="135" y="0" width="1" height="40" fill="#222" />
          <rect x="138" y="0" width="3" height="40" fill="#222" />
          <rect x="144" y="0" width="2" height="40" fill="#222" />
          <rect x="148" y="0" width="4" height="40" fill="#222" />
          <rect x="154" y="0" width="1" height="40" fill="#222" />
          <rect x="158" y="0" width="6" height="40" fill="#222" />
          <rect x="166" y="0" width="3" height="40" fill="#222" />
          <rect x="171" y="0" width="2" height="40" fill="#222" />
          <rect x="175" y="0" width="1" height="40" fill="#222" />
          <rect x="178" y="0" width="5" height="40" fill="#222" />
          <rect x="185" y="0" width="2" height="40" fill="#222" />
          <rect x="190" y="0" width="4" height="40" fill="#222" />
          <rect x="196" y="0" width="1" height="40" fill="#222" />
          <rect x="200" y="0" width="3" height="40" fill="#222" />
          <rect x="205" y="0" width="6" height="40" fill="#222" />
          <rect x="213" y="0" width="2" height="40" fill="#222" />
          <rect x="217" y="0" width="1" height="40" fill="#222" />
          <rect x="221" y="0" width="4" height="40" fill="#222" />
          <rect x="227" y="0" width="2" height="40" fill="#222" />
          <rect x="231" y="0" width="5" height="40" fill="#222" />
          <rect x="238" y="0" width="1" height="40" fill="#222" />
          <rect x="242" y="0" width="3" height="40" fill="#222" />
          <rect x="247" y="0" width="2" height="40" fill="#222" />
          <rect x="251" y="0" width="4" height="40" fill="#222" />
          <rect x="257" y="0" width="1" height="40" fill="#222" />
          <rect x="260" y="0" width="5" height="40" fill="#222" />
          <rect x="268" y="0" width="3" height="40" fill="#222" />
          <rect x="274" y="0" width="4" height="40" fill="#222" />
        </svg>
      </div>

      <div class="tagline-footer">NO REFUNDS · NO RETURNS · MEMORY SEALED</div>

      <div style="text-align: center; margin-top: 18px;">
        <div class="stamp-red">CERTIFIED BESTIE ✦ 2024</div>
      </div>
    </div>
  </div>

  <!-- Right Callout -->
  <div class="floating-callout-right">
    <div class="font-mono" style="font-size: 11px; color: #f472b6; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 6px;">Details</div>
    <div class="font-serif" style="font-size: 26px; color: #fdf2f8; font-weight: 600; line-height: 1.2;">Tactile & Permanent</div>
    <div style="font-size: 14px; color: #c99aae; margin-top: 8px; line-height: 1.45;">
      Torn edge detailing, custom rubber stamp, and thermal printer typography.
    </div>
  </div>
</div>
</body>
</html>
`;

// ==========================================
// 03. THE ACCORDION UNWRAPPED
// ==========================================
const HTML_ACCORDION = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${FONTS_CSS}

.stage {
  width: 1600px;
  height: 1200px;
  background: radial-gradient(circle at 45% 35%, #2e121a 0%, #15060d 55%, #0a0207 100%);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px;
}

.headline-badge {
  text-align: center;
  margin-bottom: 30px;
}

.badge-tag {
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  color: #f472b6;
  text-transform: uppercase;
  letter-spacing: 0.22em;
}

.badge-title {
  font-family: 'Fraunces', serif;
  font-size: 46px;
  color: #fdf2f8;
  font-weight: 600;
  margin-top: 6px;
}

.accordion-container {
  display: flex;
  align-items: center;
  perspective: 1400px;
}

/* Kraft Jacket / Envelope Left */
.kraft-cover {
  width: 290px;
  height: 560px;
  background: linear-gradient(135deg, #7c543e 0%, #5a3c2c 100%);
  border-radius: 16px 4px 4px 16px;
  border: 1px solid #946950;
  box-shadow: -15px 35px 70px rgba(0,0,0,0.65), inset 0 2px 0 rgba(255,255,255,0.2);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 34px 26px;
  transform: rotateY(18deg) rotateZ(2deg);
  z-index: 5;
  position: relative;
}

.wax-seal {
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #e11d48, #9f1239 70%, #881337);
  box-shadow: 0 12px 30px rgba(0,0,0,0.55), inset 0 2px 3px rgba(255,255,255,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fecdd3;
  font-family: 'Fraunces', serif;
  font-weight: 800;
  font-size: 24px;
  margin: 0 auto;
}

/* Fan of Panels */
.panels-fan {
  display: flex;
  margin-left: -35px;
  z-index: 10;
}

.acc-card {
  width: 260px;
  height: 510px;
  background: #fff7fb;
  border: 1px solid #e0d0c5;
  border-radius: 10px;
  padding: 22px;
  box-shadow: 0 28px 55px rgba(0,0,0,0.45);
  display: flex;
  flex-direction: column;
  transform-style: preserve-3d;
  color: #222;
  position: relative;
}

.acc-card.p1 {
  transform: rotateY(-12deg) translateY(-10px) rotateZ(-2deg);
  z-index: 11;
  background: #fffbf7;
}

.acc-card.p2 {
  transform: rotateY(15deg) translateY(10px) rotateZ(2deg);
  z-index: 12;
  margin-left: -32px;
}

.acc-card.p3 {
  transform: rotateY(-10deg) translateY(-6px) rotateZ(-1deg);
  z-index: 13;
  margin-left: -32px;
}

.acc-card.p4 {
  transform: rotateY(12deg) translateY(14px) rotateZ(3deg);
  z-index: 14;
  margin-left: -32px;
  background: #faf5eb;
}

/* Card Contents */
.pol-frame {
  background: #ffffff;
  padding: 12px 12px 28px 12px;
  border-radius: 4px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.18);
  margin-bottom: 14px;
}
.pol-img {
  width: 100%;
  height: 180px;
  background: linear-gradient(135deg, #fb7185 0%, #f43f5e 50%, #e11d48 100%);
  border-radius: 2px;
  position: relative;
  overflow: hidden;
}

.ticket-stub {
  background: #fef08a;
  border: 2px dashed #ca8a04;
  padding: 14px;
  border-radius: 6px;
  margin-top: 18px;
  font-family: 'Space Mono', monospace;
  font-size: 10.5px;
  color: #854d0e;
}

/* Leather Pull Tab */
.pull-tab {
  width: 86px;
  height: 300px;
  background: linear-gradient(105deg, #8b5a4a 0%, #a56b58 35%, #7a4a3c 70%, #5e3a30 100%);
  border: 2px solid #b87c68;
  border-radius: 0 18px 18px 0;
  box-shadow: 18px 25px 45px rgba(0,0,0,0.55), inset 0 2px 0 rgba(255,255,255,0.3);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 26px 12px;
  margin-left: -8px;
  z-index: 20;
  transform: rotateY(8deg) translateY(10px);
}

.stitch-line {
  width: 2px;
  height: 100%;
  position: absolute;
  left: 6px;
  top: 0;
  background: repeating-linear-gradient(180deg, #f0d8c8 0 3px, transparent 3px 7px);
}

.pull-title {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #f0d8c8;
}

.pull-script {
  font-family: 'Caveat', cursive;
  font-size: 28px;
  color: #fff0e4;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}

.pull-counter {
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  color: #f0d8c8;
  font-weight: 700;
}
</style>
</head>
<body>
<div class="stage">
  <div class="noise-overlay"></div>

  <div class="headline-badge">
    <div class="badge-tag">Format No. 04 · The Accordion</div>
    <h1 class="badge-title">Let the story unfold.</h1>
  </div>

  <div class="accordion-container">
    <!-- Kraft Outer Jacket -->
    <div class="kraft-cover">
      <div class="font-mono" style="font-size: 11px; letter-spacing: 0.18em; color: #e2c1a8; text-transform: uppercase;">
        ✦ SOUVENIR PARCEL
      </div>
      <div class="wax-seal">XSO</div>
      <div class="font-hand" style="font-size: 24px; color: #fae8dc; text-align: center;">
        open when you miss me
      </div>
    </div>

    <!-- Fan of 4 Linked Postcard Panels -->
    <div class="panels-fan">
      <!-- Panel 1: Polaroid & Memory -->
      <div class="acc-card p1">
        <div style="font-family: 'Space Mono'; font-size: 10px; color: #888; margin-bottom: 8px;">PANEL 01 · THE BEGINNING</div>
        <div class="pol-frame">
          <div class="pol-img">
            <div style="position: absolute; bottom: 8px; right: 8px; font-family: 'Space Mono'; font-size: 9px; color: #fff; font-weight: 700; background: rgba(0,0,0,0.5); padding: 2px 6px; border-radius: 4px;">JULY 2023</div>
          </div>
        </div>
        <div class="font-hand" style="font-size: 20px; color: #1c1917; text-align: center;">
          "the day we got lost in Big Sur"
        </div>
      </div>

      <!-- Panel 2: Mini Thermal Receipt -->
      <div class="acc-card p2">
        <div style="font-family: 'Space Mono'; font-size: 10px; color: #888; margin-bottom: 8px;">PANEL 02 · THE AUDIT</div>
        <div style="background: #fff; border: 1px dashed #444; padding: 16px; border-radius: 4px; font-family: 'Courier Prime'; font-size: 10.5px; flex: 1;">
          <div style="text-align: center; font-weight: 700; margin-bottom: 8px;">HIGHWAY 1 DINER</div>
          <div style="margin-bottom: 5px;">2x CHERRY PIE ..... $9.00</div>
          <div style="margin-bottom: 5px;">2x BLACK COFFEE ... $6.00</div>
          <div style="margin-bottom: 5px;">1x 3-HOUR TALK .... $0.00</div>
          <div style="border-top: 1px dashed #888; margin: 10px 0;"></div>
          <div style="font-weight: 700; font-size: 12px;">TOTAL: PRICELESS</div>
        </div>
        <div style="margin-top: 10px; text-align: center;">
          <span style="border: 2px solid #e11d48; color: #e11d48; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 4px;">VERIFIED ✦</span>
        </div>
      </div>

      <!-- Panel 3: Handwritten Letter Note -->
      <div class="acc-card p3">
        <div style="font-family: 'Space Mono'; font-size: 10px; color: #888; margin-bottom: 8px;">PANEL 03 · THE LETTER</div>
        <div class="font-hand" style="font-size: 22px; line-height: 1.38; color: #1e293b; flex: 1;">
          Dear Jamie,<br><br>
          I still think about that night on the pier under the salt breeze. You said we'd make it. And look at us now.<br><br>
          Love always,<br>
          Riley
        </div>
      </div>

      <!-- Panel 4: Ticket Stub -->
      <div class="acc-card p4">
        <div style="font-family: 'Space Mono'; font-size: 10px; color: #888; margin-bottom: 8px;">PANEL 04 · SOUVENIR</div>
        <div class="ticket-stub">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px;">THE MIDNIGHT SHOW</div>
          <div>BROOKLYN STEEL · ROW A</div>
          <div>DATE: JUNE 21, 2024</div>
          <div style="margin-top: 10px; font-weight: 700; color: #b45309;">ADMIT ONE VIP</div>
        </div>
        <div class="font-hand" style="font-size: 20px; color: #444; margin-top: 24px; text-align: center;">
          until the next encore ★
        </div>
      </div>
    </div>

    <!-- Leather Pull Tab -->
    <div class="pull-tab">
      <div class="stitch-line"></div>
      <div class="pull-title">PULL</div>
      <div class="pull-script">next panel</div>
      <div class="pull-counter">4 / 4</div>
    </div>
  </div>
</div>
</body>
</html>
`;

// ==========================================
// 04. THE SCRAPBOOK BOARD (DESK FLAT-LAY)
// ==========================================
const HTML_SCRAPBOOK = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${FONTS_CSS}

.stage {
  width: 1600px;
  height: 1200px;
  background: radial-gradient(circle at 50% 50%, #f7f1e6 0%, #ebe0d2 60%, #d6c6b2 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.desk-grain {
  position: absolute;
  inset: 0;
  background-image: repeating-linear-gradient(45deg, rgba(0,0,0,0.015) 0, rgba(0,0,0,0.015) 2px, transparent 2px, transparent 8px);
  pointer-events: none;
}

/* Scrapbook Canvas Area */
.board-wrap {
  width: 1440px;
  height: 1040px;
  position: relative;
}

/* Washi tape styling */
.washi {
  position: absolute;
  height: 30px;
  background: rgba(244, 114, 182, 0.45);
  border-left: 2px dashed rgba(255,255,255,0.4);
  border-right: 2px dashed rgba(255,255,255,0.4);
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  z-index: 25;
}

/* Polaroid 1 */
.polaroid-1 {
  position: absolute;
  top: 80px;
  left: 80px;
  width: 340px;
  height: 400px;
  background: #fffdfa;
  padding: 16px 16px 42px 16px;
  border-radius: 4px;
  box-shadow: 0 25px 50px rgba(50, 30, 20, 0.28);
  transform: rotate(-7deg);
  z-index: 10;
}
.pol-photo-1 {
  width: 100%;
  height: 270px;
  background: linear-gradient(135deg, #f97316 0%, #ec4899 100%);
  border-radius: 2px;
}

/* Polaroid 2 */
.polaroid-2 {
  position: absolute;
  top: 90px;
  right: 100px;
  width: 330px;
  height: 390px;
  background: #fffdfa;
  padding: 16px 16px 42px 16px;
  border-radius: 4px;
  box-shadow: 0 25px 50px rgba(50, 30, 20, 0.28);
  transform: rotate(8deg);
  z-index: 12;
}
.pol-photo-2 {
  width: 100%;
  height: 260px;
  background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
  border-radius: 2px;
}

/* Sticky Note 1 (Yellow) */
.sticky-yellow {
  position: absolute;
  top: 480px;
  left: 140px;
  width: 260px;
  height: 260px;
  background: #fef08a;
  padding: 26px;
  box-shadow: 0 18px 35px rgba(70, 50, 20, 0.22);
  transform: rotate(4deg);
  z-index: 20;
}

/* Sticky Note 2 (Pink) */
.sticky-pink {
  position: absolute;
  top: 470px;
  right: 140px;
  width: 250px;
  height: 250px;
  background: #fbcfe8;
  padding: 26px;
  box-shadow: 0 18px 35px rgba(70, 50, 20, 0.22);
  transform: rotate(-6deg);
  z-index: 20;
}

/* Letter Card in Center */
.letter-center {
  position: absolute;
  top: 240px;
  left: 480px;
  width: 480px;
  height: 520px;
  background: #fff7fb;
  padding: 42px 38px;
  border-radius: 8px;
  box-shadow: 0 35px 70px rgba(40, 20, 10, 0.25), inset 0 0 35px rgba(240, 220, 210, 0.4);
  transform: rotate(-1deg);
  z-index: 8;
  border: 1px solid #e8ddd0;
}

/* Thermal Receipt in Corner */
.mini-receipt {
  position: absolute;
  bottom: 80px;
  left: 440px;
  width: 260px;
  background: #fffaf5;
  padding: 20px;
  box-shadow: 0 20px 40px rgba(50, 30, 20, 0.25);
  transform: rotate(-5deg);
  z-index: 22;
  font-family: 'Courier Prime', monospace;
  font-size: 10.5px;
  color: #222;
}

/* Concert Ticket */
.ticket-flat {
  position: absolute;
  bottom: 90px;
  right: 440px;
  width: 310px;
  background: #fed7aa;
  border: 2px dashed #ea580c;
  border-radius: 8px;
  padding: 18px 22px;
  box-shadow: 0 20px 40px rgba(60, 30, 10, 0.25);
  transform: rotate(4deg);
  z-index: 22;
}

/* Reshuffle Button Bottom Right */
.reshuffle-btn {
  position: absolute;
  bottom: 40px;
  right: 50px;
  background: linear-gradient(165deg, #f7f1e4 0%, #e8dcc8 55%, #d9cbb4 100%);
  border: 1px solid #c4b59a;
  border-radius: 8px;
  padding: 12px 24px;
  box-shadow: 0 8px 0 #8a7358, 0 14px 28px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 30;
}
</style>
</head>
<body>
<div class="stage">
  <div class="desk-grain"></div>

  <div class="board-wrap">
    <!-- Polaroid 1 -->
    <div class="washi" style="top: 68px; left: 190px; width: 110px; transform: rotate(-8deg);"></div>
    <div class="polaroid-1">
      <div class="pol-photo-1"></div>
      <div class="font-hand" style="font-size: 26px; color: #262626; margin-top: 10px; text-align: center;">
        the summer we never slept.
      </div>
    </div>

    <!-- Polaroid 2 -->
    <div class="washi" style="top: 75px; right: 200px; width: 100px; background: rgba(56, 189, 248, 0.45); transform: rotate(10deg);"></div>
    <div class="polaroid-2">
      <div class="pol-photo-2"></div>
      <div class="font-hand" style="font-size: 26px; color: #262626; margin-top: 10px; text-align: center;">
        3:00 am city drives ✦
      </div>
    </div>

    <!-- Letter Note Center -->
    <div class="letter-center">
      <div class="font-mono" style="font-size: 11px; letter-spacing: 0.2em; color: #e11d48; text-transform: uppercase; margin-bottom: 14px;">
        ✦ MEMORY CAPSULE
      </div>
      <div class="font-hand" style="font-size: 26px; line-height: 1.42; color: #1e293b;">
        "I kept every ticket stub, every coffee cup sleeve, and every receipt from that week. People thought we were crazy, but some memories deserve to stay in permanent ink."
      </div>
      <div class="font-hand" style="font-size: 28px; color: #e11d48; margin-top: 28px; text-align: right;">
        — forever your sidekick
      </div>
    </div>

    <!-- Yellow Sticky Note -->
    <div class="sticky-yellow">
      <div class="font-mono" style="font-size: 9.5px; letter-spacing: 0.15em; color: #854d0e; text-transform: uppercase;">
        SECRET NOTE 🔒
      </div>
      <div class="font-hand" style="font-size: 23px; line-height: 1.35; color: #713f12; margin-top: 10px;">
        p.s. you still owe me a matcha latte from that rainy tuesday in soho!
      </div>
    </div>

    <!-- Pink Sticky Note -->
    <div class="sticky-pink">
      <div class="font-mono" style="font-size: 9.5px; letter-spacing: 0.15em; color: #9d174d; text-transform: uppercase;">
        AUDIO NOTE 🎙
      </div>
      <div class="font-hand" style="font-size: 23px; line-height: 1.35; color: #831843; margin-top: 10px;">
        "track 04: playing on repeat whenever I take the train home."
      </div>
    </div>

    <!-- Mini Thermal Receipt -->
    <div class="mini-receipt">
      <div style="text-align: center; font-weight: 700; margin-bottom: 4px;">DOWNTOWN DINER</div>
      <div style="font-size: 9px; color: #555; text-align: center; margin-bottom: 8px;">OCT 24 · 02:47 AM</div>
      <div style="border-top: 1px dashed #444; margin: 4px 0;"></div>
      <div>1x MIDNIGHT CONFESSION ... $0.00</div>
      <div>2x WARM COOKIES ......... $7.50</div>
      <div>1x EMOTIONAL TAX ....... $12.00</div>
      <div style="border-top: 1px dashed #444; margin: 4px 0;"></div>
      <div style="font-weight: 700;">TOTAL: PRICELESS</div>
    </div>

    <!-- Ticket Stub -->
    <div class="ticket-flat">
      <div class="font-mono" style="font-size: 11px; font-weight: 700; color: #9a3412;">ECHO PARK MUSIC FESTIVAL</div>
      <div class="font-mono" style="font-size: 10px; color: #c2410c; margin-top: 2px;">GENERAL ADMISSION · ROW 01</div>
      <div class="font-mono" style="font-size: 9px; color: #7c2d12; margin-top: 4px;">BARCODE: #8942-0194-XSO</div>
    </div>
  </div>

  <!-- Reshuffle Button UI -->
  <div class="reshuffle-btn">
    <span class="font-mono" style="font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: #7a6a55;">Flat-lay</span>
    <span class="font-hand" style="font-size: 20px; color: #3a3028; font-weight: 700; margin-top: 2px;">Reshuffle</span>
    <span class="font-mono" style="font-size: 10px; letter-spacing: 0.15em; color: #5c4e3e; margin-top: 2px;">COLLAGE ✦</span>
  </div>
</div>
</body>
</html>
`;

// ==========================================
// 05. THE LOOP ON A PHONE
// ==========================================
const HTML_LOOP_PHONE = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${FONTS_CSS}

.stage {
  width: 1600px;
  height: 1200px;
  background: radial-gradient(circle at 50% 35%, #341224 0%, #170711 55%, #0a0208 100%);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.ambient-glow {
  position: absolute;
  width: 750px;
  height: 750px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(244, 114, 182, 0.3) 0%, rgba(244, 114, 182, 0) 70%);
  filter: blur(95px);
}

.phone-mockup {
  position: relative;
  width: 450px;
  height: 910px;
  background: #090306;
  border-radius: 56px;
  padding: 14px;
  box-shadow: 0 45px 100px rgba(0,0,0,0.85), 0 0 0 4px #2b1420, 0 0 0 7px #4a2136, 0 0 60px rgba(244, 114, 182, 0.28);
  z-index: 10;
  display: flex;
  flex-direction: column;
}

.phone-screen {
  flex: 1;
  border-radius: 44px;
  background: radial-gradient(circle at 50% 20%, #200a17 0%, #0d040a 100%);
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 24px 22px;
}

.dynamic-island {
  width: 124px;
  height: 32px;
  background: #000;
  border-radius: 999px;
  margin: 0 auto 16px auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
}

.island-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #111;
  border: 1.5px solid #222;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 8px;
}

.logo-tag {
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  color: #f472b6;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

/* The Memory Card in Screen */
.memory-card {
  flex: 1;
  background: #180913;
  border: 1px solid rgba(244, 114, 182, 0.25);
  border-radius: 30px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0,0,0,0.6);
  position: relative;
  overflow: hidden;
}

.memory-photo {
  width: 100%;
  height: 380px;
  border-radius: 22px;
  background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%);
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0,0,0,0.4);
}

.date-chip {
  position: absolute;
  top: 14px;
  left: 14px;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(8px);
  padding: 6px 14px;
  border-radius: 999px;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #fdf2f8;
  border: 1px solid rgba(255,255,255,0.15);
}

.memory-audio {
  margin-top: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.song-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.song-title {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 16.5px;
  font-weight: 600;
  color: #fdf2f8;
}

.song-sub {
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: #f472b6;
}

.audio-bar {
  height: 4px;
  background: rgba(255,255,255,0.15);
  border-radius: 2px;
  position: relative;
  overflow: hidden;
}

.audio-progress {
  width: 65%;
  height: 100%;
  background: #f472b6;
  border-radius: 2px;
}

.bottom-controls {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.loop-cue {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(244, 114, 182, 0.15);
  border: 1px solid rgba(244, 114, 182, 0.3);
  padding: 8px 18px;
  border-radius: 999px;
  font-family: 'Space Mono', monospace;
  font-size: 10.5px;
  color: #fbcfe8;
  letter-spacing: 0.08em;
}

/* Background floating badges */
.floating-badge-left {
  position: absolute;
  left: 110px;
  top: 360px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(16px);
  padding: 24px 30px;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  max-width: 330px;
}

.floating-badge-right {
  position: absolute;
  right: 110px;
  bottom: 340px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(16px);
  padding: 24px 30px;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  max-width: 330px;
}
</style>
</head>
<body>
<div class="stage">
  <div class="noise-overlay"></div>
  <div class="ambient-glow"></div>

  <!-- Left Callout -->
  <div class="floating-badge-left">
    <div class="font-mono" style="font-size: 11px; color: #f472b6; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 6px;">Format No. 01</div>
    <div class="font-serif" style="font-size: 28px; color: #fdf2f8; font-weight: 600; line-height: 1.2;">The Loop</div>
    <div style="font-size: 14px; color: #c99aae; margin-top: 8px; line-height: 1.45;">
      Cinemagraph memories & synchronized audio that loop seamlessly on mobile.
    </div>
  </div>

  <!-- Smartphone Mockup -->
  <div class="phone-mockup">
    <div class="phone-screen">
      <div class="dynamic-island">
        <div class="island-dot"></div>
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #06b6d4;"></div>
      </div>

      <div class="top-bar">
        <span class="logo-tag">XSO // THE LOOP</span>
        <span class="font-mono" style="font-size: 10px; color: #888;">01 / 05</span>
      </div>

      <div class="memory-card">
        <div class="memory-photo">
          <div class="date-chip">OCT 24 · 02:15 AM</div>
          <div style="position: absolute; bottom: 18px; left: 18px; right: 18px;">
            <div class="font-hand" style="font-size: 30px; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,0.6);">
              "the night we decided to stay"
            </div>
          </div>
        </div>

        <div class="memory-audio">
          <div class="song-info">
            <div>
              <div class="song-title">Our Midnight Anthem</div>
              <div class="song-sub">SOUVENIR AUDIO LOOP ✦</div>
            </div>
            <span style="font-size: 20px;">🔊</span>
          </div>

          <div class="audio-bar">
            <div class="audio-progress"></div>
          </div>
        </div>
      </div>

      <div class="bottom-controls">
        <div class="loop-cue">
          <span>↻</span> SWIPE TO RELIVE
        </div>
        <span class="font-mono" style="font-size: 10px; color: #f472b6;">LOOPING ♾</span>
      </div>
    </div>
  </div>

  <!-- Right Callout -->
  <div class="floating-badge-right">
    <div class="font-mono" style="font-size: 11px; color: #f472b6; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 6px;">Experience</div>
    <div class="font-serif" style="font-size: 26px; color: #fdf2f8; font-weight: 600; line-height: 1.2;">Living Keepsakes</div>
    <div style="font-size: 14px; color: #c99aae; margin-top: 8px; line-height: 1.45;">
      Delivered as an interactive web unboxing — no app install needed.
    </div>
  </div>
</div>
</body>
</html>
`;

async function renderImages() {
  console.log('Launching browser to render 1600x1200 images...');
  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1200 },
    deviceScaleFactor: 1,
  });

  const scenes = [
    { name: '01_five_formats.png', html: HTML_FIVE_FORMATS },
    { name: '02_thermal_receipt.png', html: HTML_RECEIPT },
    { name: '03_accordion_unwrapped.png', html: HTML_ACCORDION },
    { name: '04_scrapbook_board.png', html: HTML_SCRAPBOOK },
    { name: '05_loop_on_phone.png', html: HTML_LOOP_PHONE },
  ];

  for (const scene of scenes) {
    console.log(`Rendering ${scene.name}...`);
    const page = await context.newPage();
    await page.setContent(scene.html, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const outPath = path.join(OUT_DIR, scene.name);
    await page.screenshot({ path: outPath, type: 'png' });

    const artifactPath = path.join(ARTIFACT_DIR, scene.name);
    copyFileSync(outPath, artifactPath);

    console.log(`Saved ${outPath} and ${artifactPath}`);
    await page.close();
  }

  await browser.close();
  console.log('All 5 renders completed successfully at 1600x1200 (4:3)!');
}

renderImages().catch((err) => {
  console.error(err);
  process.exit(1);
});
