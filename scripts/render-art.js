// Renders the app icon, Android adaptive icon, splash mark and favicon from
// vector art with headless Chromium:  node scripts/render-art.js
const path = require('path');
const { chromium } = require('playwright');

const planet = (bg) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <radialGradient id="sky" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#2A1F6E"/><stop offset="0.55" stop-color="#0E1035"/><stop offset="1" stop-color="#04050C"/>
    </radialGradient>
    <radialGradient id="neb" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#7C5CFF" stop-opacity="0.55"/><stop offset="1" stop-color="#7C5CFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="neb2" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#2BB8FF" stop-opacity="0.4"/><stop offset="1" stop-color="#2BB8FF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0.55" stop-color="#FFC85A" stop-opacity="0.55"/><stop offset="1" stop-color="#FFC85A" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="body" cx="36%" cy="30%" r="80%">
      <stop offset="0" stop-color="#FFF1C2"/><stop offset="0.45" stop-color="#E8AE4E"/><stop offset="1" stop-color="#6E400E"/>
    </radialGradient>
    <radialGradient id="shade" cx="34%" cy="28%" r="82%">
      <stop offset="0.5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/>
    </radialGradient>
    <radialGradient id="moon" cx="35%" cy="30%" r="80%">
      <stop offset="0" stop-color="#9EF0FF"/><stop offset="0.5" stop-color="#2E8BE0"/><stop offset="1" stop-color="#0B2A5E"/>
    </radialGradient>
    <radialGradient id="nova" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.25" stop-color="#FFE9A8"/><stop offset="0.6" stop-color="#FF8A3D" stop-opacity="0.5"/><stop offset="1" stop-color="#FF6A2B" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="pc"><circle cx="512" cy="530" r="235"/></clipPath>
    <clipPath id="front"><rect x="0" y="530" width="1024" height="600"/></clipPath>
  </defs>
  ${bg ? `<rect width="1024" height="1024" fill="url(#sky)"/>
  <ellipse cx="260" cy="260" rx="520" ry="300" fill="url(#neb)"/>
  <ellipse cx="900" cy="820" rx="520" ry="320" fill="url(#neb2)"/>
  ${Array.from({ length: 60 }, (_, i) => {
    const x = (i * 197) % 1024, y = (i * 331 + 77) % 1024, r = i % 7 === 0 ? 4 : i % 3 === 0 ? 2.6 : 1.6;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${0.35 + (i % 5) * 0.13}"/>`;
  }).join('')}` : ''}
  <circle cx="512" cy="530" r="360" fill="url(#glow)"/>
  <g transform="rotate(-16 512 530)">
    <ellipse cx="512" cy="530" rx="410" ry="112" fill="none" stroke="#F6D894" stroke-width="44" opacity="0.9"/>
    <ellipse cx="512" cy="530" rx="345" ry="88" fill="none" stroke="#C08A3A" stroke-width="22" opacity="0.8"/>
  </g>
  <circle cx="512" cy="530" r="235" fill="url(#body)"/>
  <g clip-path="url(#pc)" opacity="0.5">
    <rect x="0" y="370" width="1024" height="34" fill="#C08A3A"/>
    <rect x="0" y="450" width="1024" height="26" fill="#F3D08A"/>
    <rect x="0" y="530" width="1024" height="40" fill="#C08A3A"/>
    <rect x="0" y="615" width="1024" height="26" fill="#F3D08A"/>
    <rect x="0" y="680" width="1024" height="34" fill="#C08A3A"/>
  </g>
  <circle cx="512" cy="530" r="235" fill="url(#shade)"/>
  <ellipse cx="440" cy="425" rx="105" ry="58" fill="#fff" opacity="0.32"/>
  <g transform="rotate(-16 512 530)" clip-path="url(#front)">
    <ellipse cx="512" cy="530" rx="410" ry="112" fill="none" stroke="#F6D894" stroke-width="44" opacity="0.95"/>
    <ellipse cx="512" cy="530" rx="345" ry="88" fill="none" stroke="#C08A3A" stroke-width="22" opacity="0.85"/>
  </g>
  <circle cx="790" cy="250" r="78" fill="url(#moon)"/>
  <ellipse cx="770" cy="226" rx="30" ry="17" fill="#fff" opacity="0.35"/>
  <circle cx="225" cy="805" r="120" fill="url(#nova)"/>
  <circle cx="225" cy="805" r="30" fill="#fff"/>
</svg>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
  const out = (f) => path.join(__dirname, '..', 'assets', f);
  const shot = async (svg, file, size, transparent) => {
    await page.setViewportSize({ width: 1024, height: 1024 });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
    await page.screenshot({ path: out(file), omitBackground: transparent, clip: { x: 0, y: 0, width: 1024, height: 1024 } });
    if (size !== 1024) {
      const b64 = (await require('fs').promises.readFile(out(file))).toString('base64');
      await page.setViewportSize({ width: size, height: size });
      await page.setContent(`<html><body style="margin:0;background:transparent"><img src="data:image/png;base64,${b64}" width="${size}" height="${size}"></body></html>`);
      await page.screenshot({ path: out(file), omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
    }
  };
  await shot(planet(true), 'icon.png', 1024, false);
  // Adaptive icon foreground: art scaled into the 66% safe zone, transparent background.
  await shot(`<div style="width:1024px;height:1024px;display:flex;align-items:center;justify-content:center"><div style="transform:scale(0.66)">${planet(false)}</div></div>`, 'adaptive-icon.png', 1024, true);
  await shot(planet(false), 'splash-icon.png', 1024, true);
  await shot(planet(true), 'favicon.png', 64, false);
  await browser.close();
  console.log('art rendered');
})();
