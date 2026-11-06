// Vector planet art for every tier. Drawn in a 100×100 viewBox so it scales
// crisply to any cell size, on every device density.
import React, { memo, useId } from 'react';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Circle, Ellipse, Path, G, ClipPath, Rect, Polygon } from 'react-native-svg';
import { skinById } from '../game/skins';

const RADIUS = { 1: 33, 2: 35, 3: 36, 4: 38, 5: 40, 6: 42, 7: 31, 8: 30, 9: 38 };
// Dark Matter looks the same in every skin so it always reads as "junk".
const DARK_PAL = { light: '#3B2A5C', mid: '#1C1430', dark: '#07050D', f1: '#B47CFF', f2: '#E6D2FF', rim: '#8A5CFF', glow: '#6A2DFF' };

// Deterministic lumpy outline for the asteroid.
function asteroidPath(R) {
  const n = 11;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.84 + 0.16 * Math.abs(Math.sin(i * 2.7 + 1.3));
    pts.push([50 + Math.cos(a) * R * k, 50 + Math.sin(a) * R * k * 0.92]);
  }
  let d = '';
  for (let i = 0; i < n; i++) {
    const p0 = pts[i];
    const p1 = pts[(i + 1) % n];
    const mid = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
    if (i === 0) d += `M${((pts[n - 1][0] + p0[0]) / 2).toFixed(1)},${((pts[n - 1][1] + p0[1]) / 2).toFixed(1)}`;
    d += ` Q${p0[0].toFixed(1)},${p0[1].toFixed(1)} ${mid[0].toFixed(1)},${mid[1].toFixed(1)}`;
  }
  return d + 'Z';
}
const AST = {};
const astPath = (R) => (AST[R] = AST[R] || asteroidPath(R));

function starPoints(cx, cy, outer, inner, n, rot = 0) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i / (n * 2)) * Math.PI * 2;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

function Planet({ tier, size, skinId = 'cosmic', ghost = false }) {
  const skin = skinById(skinId);
  const pal = tier === 9 ? DARK_PAL : skin.palette[tier] || skin.palette[1];
  const neon = tier === 9 ? false : skin.neon;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const id = (k) => `${k}${uid}`;
  const R = RADIUS[tier] || 36;
  const P = (x, y) => [50 + x * R, 50 + y * R];
  const featureOpacity = neon ? 0.9 : 1;

  const lumpy = tier === 1 || tier === 9;
  const body = lumpy
    ? <Path d={astPath(R)} fill={`url(#${id('body')})`} />
    : <Circle cx={50} cy={50} r={R} fill={`url(#${id('body')})`} />;
  const clipShape = lumpy ? <Path d={astPath(R)} /> : <Circle cx={50} cy={50} r={R} />;

  const crater = (x, y, r, key) => {
    const [cx, cy] = P(x, y);
    return (
      <G key={key}>
        <Circle cx={cx} cy={cy} r={r * R} fill={pal.f1} opacity={neon ? 0 : 0.75} stroke={neon ? pal.f1 : 'none'} strokeWidth={neon ? 1.6 : 0} />
        {!neon && <Circle cx={cx + r * R * 0.18} cy={cy + r * R * 0.22} r={r * R * 0.78} fill={pal.f2} opacity={0.18} />}
      </G>
    );
  };

  let features = null;
  switch (tier) {
    case 1:
      features = [crater(-0.3, -0.2, 0.2, 'a'), crater(0.32, 0.18, 0.15, 'b'), crater(-0.05, 0.42, 0.11, 'c'), crater(0.25, -0.45, 0.09, 'd')];
      break;
    case 2:
      features = [
        <Path key="m1" d={`M${P(-0.6, -0.1)} Q${P(-0.2, -0.5)} ${P(0.15, -0.2)} Q${P(0.0, 0.15)} ${P(-0.55, 0.15)} Z`} fill={pal.f1} opacity={neon ? 0 : 0.45} stroke={neon ? pal.f1 : 'none'} strokeWidth={1.4} />,
        crater(0.35, 0.25, 0.16, 'a'), crater(-0.25, 0.5, 0.1, 'b'), crater(0.45, -0.35, 0.08, 'c'), crater(-0.1, -0.6, 0.07, 'd'),
      ];
      break;
    case 3:
      features = [
        crater(-0.35, -0.25, 0.14, 'a'), crater(0.3, -0.1, 0.1, 'b'), crater(0.05, 0.35, 0.16, 'c'),
        crater(-0.5, 0.3, 0.08, 'd'), crater(0.5, 0.4, 0.07, 'e'), crater(0.1, -0.55, 0.07, 'f'), crater(-0.15, 0.05, 0.05, 'g'),
      ];
      break;
    case 4:
      features = [
        <Path key="p1" d={`M${P(-1, 0.1)} Q${P(-0.4, -0.15)} ${P(0.1, 0.15)} T${P(1, 0.05)} L${P(1, 0.4)} Q${P(0.3, 0.55)} ${P(-0.2, 0.3)} T${P(-1, 0.45)} Z`} fill={pal.f1} opacity={neon ? 0.35 : 0.55} />,
        <Path key="p2" d={`M${P(-0.3, -0.45)} Q${P(0, -0.6)} ${P(0.35, -0.4)} Q${P(0.1, -0.3)} ${P(-0.3, -0.45)} Z`} fill={pal.f1} opacity={0.45} />,
        <Ellipse key="cap" cx={50} cy={50 - R * 0.93} rx={R * 0.5} ry={R * 0.2} fill={pal.f2} opacity={neon ? 0.8 : 0.9} />,
      ];
      break;
    case 5:
      features = [
        <Path key="c1" d={`M${P(-0.75, -0.35)} Q${P(-0.35, -0.75)} ${P(0.0, -0.4)} Q${P(0.15, -0.05)} ${P(-0.2, 0.05)} Q${P(-0.35, 0.45)} ${P(-0.6, 0.3)} Q${P(-0.9, 0.0)} ${P(-0.75, -0.35)} Z`} fill={pal.f1} opacity={featureOpacity} />,
        <Path key="c2" d={`M${P(0.3, 0.05)} Q${P(0.7, -0.15)} ${P(0.85, 0.25)} Q${P(0.7, 0.7)} ${P(0.35, 0.65)} Q${P(0.15, 0.35)} ${P(0.3, 0.05)} Z`} fill={pal.f1} opacity={featureOpacity} />,
        <Path key="cl1" d={`M${P(-0.9, 0.55)} Q${P(-0.3, 0.42)} ${P(0.4, 0.82)}`} stroke={pal.f2} strokeWidth={R * 0.09} strokeLinecap="round" fill="none" opacity={0.65} />,
        <Path key="cl2" d={`M${P(-0.2, -0.75)} Q${P(0.3, -0.62)} ${P(0.75, -0.45)}`} stroke={pal.f2} strokeWidth={R * 0.07} strokeLinecap="round" fill="none" opacity={0.6} />,
      ];
      break;
    case 6:
      features = [
        ...[-0.55, -0.2, 0.15, 0.5].map((y, i) => (
          <Rect key={`b${i}`} x={0} y={50 + y * R} width={100} height={R * (i % 2 ? 0.14 : 0.2)} fill={i % 2 ? pal.f2 : pal.f1} opacity={neon ? 0.7 : 0.4} />
        )),
        <Ellipse key="spot" cx={50 + R * 0.3} cy={50 + R * 0.28} rx={R * 0.24} ry={R * 0.12} fill={pal.f2} opacity={neon ? 0.9 : 0.75} />,
      ];
      break;
    case 7:
      features = [-0.55, -0.25, 0.05, 0.35, 0.62].map((y, i) => (
        <Rect key={`b${i}`} x={0} y={50 + y * R} width={100} height={R * 0.16} fill={i % 2 ? pal.f2 : pal.f1} opacity={neon ? 0.6 : 0.5} />
      ));
      break;
    case 9:
      features = [
        <Path key="k1" d={`M${P(-0.55, -0.35)} L${P(-0.15, -0.05)} L${P(-0.3, 0.3)} L${P(0.05, 0.55)}`} stroke={pal.f1} strokeWidth={3.2} fill="none" strokeLinejoin="round" />,
        <Path key="k2" d={`M${P(-0.15, -0.05)} L${P(0.3, -0.2)} L${P(0.55, 0.15)}`} stroke={pal.f1} strokeWidth={2.6} fill="none" strokeLinejoin="round" />,
        <Path key="k3" d={`M${P(0.3, -0.2)} L${P(0.2, -0.6)}`} stroke={pal.f2} strokeWidth={1.6} fill="none" />,
        <Circle key="c1" cx={50 + R * -0.15} cy={50 + R * -0.05} r={3} fill={pal.f2} />,
      ];
      break;
    default:
      break;
  }

  const ringTilt = -16;
  const ring = (front) => (
    <G rotation={ringTilt} origin="50, 50" clipPath={front ? `url(#${id('front')})` : undefined}>
      <Ellipse cx={50} cy={50} rx={R * 1.62} ry={R * 0.46} stroke={pal.f2} strokeWidth={R * 0.2} fill="none" opacity={neon ? 0.95 : 0.85} />
      <Ellipse cx={50} cy={50} rx={R * 1.62} ry={R * 0.46} stroke={pal.dark} strokeWidth={R * 0.04} fill="none" opacity={0.5} />
      <Ellipse cx={50} cy={50} rx={R * 1.36} ry={R * 0.36} stroke={pal.f1} strokeWidth={R * 0.1} fill="none" opacity={0.7} />
    </G>
  );

  if (tier === 8) {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100" opacity={ghost ? 0.35 : 1}>
        <Defs>
          <RadialGradient id={id('glow')} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={pal.glow} stopOpacity={0.95} />
            <Stop offset="0.45" stopColor={pal.glow} stopOpacity={0.45} />
            <Stop offset="1" stopColor={pal.glow} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={id('body')} cx="45%" cy="42%" r="60%">
            <Stop offset="0" stopColor={pal.light} />
            <Stop offset="0.45" stopColor={pal.mid} />
            <Stop offset="1" stopColor={pal.dark} />
          </RadialGradient>
        </Defs>
        <Circle cx={50} cy={50} r={50} fill={`url(#${id('glow')})`} />
        <Polygon points={starPoints(50, 50, 49, 14, 4, -Math.PI / 2)} fill={pal.f2} opacity={0.85} />
        <Polygon points={starPoints(50, 50, 38, 12, 4, -Math.PI / 4)} fill={pal.f1} opacity={0.7} />
        <Circle cx={50} cy={50} r={R} fill={`url(#${id('body')})`} />
        <Circle cx={45} cy={44} r={R * 0.45} fill="#FFFFFF" opacity={0.75} />
      </Svg>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={ghost ? 0.35 : 1}>
      <Defs>
        <RadialGradient id={id('body')} cx="36%" cy="32%" r="78%">
          <Stop offset="0" stopColor={pal.light} />
          <Stop offset="0.5" stopColor={pal.mid} />
          <Stop offset="1" stopColor={pal.dark} />
        </RadialGradient>
        <RadialGradient id={id('shade')} cx="34%" cy="30%" r="80%">
          <Stop offset="0.5" stopColor="#000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000" stopOpacity={neon ? 0.2 : 0.55} />
        </RadialGradient>
        <LinearGradient id={id('hl')} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFF" stopOpacity={neon ? 0.25 : 0.55} />
          <Stop offset="1" stopColor="#FFF" stopOpacity={0} />
        </LinearGradient>
        {pal.glow && (
          <RadialGradient id={id('glow')} cx="50%" cy="50%" r="50%">
            <Stop offset={R / 50 - 0.04} stopColor={pal.glow} stopOpacity={neon ? 0.7 : 0.5} />
            <Stop offset="1" stopColor={pal.glow} stopOpacity={0} />
          </RadialGradient>
        )}
        <ClipPath id={id('clip')}>{clipShape}</ClipPath>
        {tier === 7 && (
          <ClipPath id={id('front')}>
            <Rect x={-20} y={50} width={140} height={60} />
          </ClipPath>
        )}
      </Defs>

      {pal.glow && <Circle cx={50} cy={50} r={50} fill={`url(#${id('glow')})`} />}
      {tier === 7 && ring(false)}
      {body}
      <G clipPath={`url(#${id('clip')})`}>{features}</G>
      {lumpy ? <Path d={astPath(R)} fill={`url(#${id('shade')})`} /> : <Circle cx={50} cy={50} r={R} fill={`url(#${id('shade')})`} />}
      <Ellipse cx={50 - R * 0.28} cy={50 - R * 0.42} rx={R * 0.45} ry={R * 0.26} fill={`url(#${id('hl')})`} />
      {lumpy
        ? <Path d={astPath(R)} fill="none" stroke={pal.rim} strokeWidth={neon ? 2.6 : 1} opacity={neon ? 1 : 0.35} />
        : <Circle cx={50} cy={50} r={R - (neon ? 1.2 : 0.5)} fill="none" stroke={pal.rim} strokeWidth={neon ? 2.6 : 1} opacity={neon ? 1 : 0.35} />}
      {tier === 7 && ring(true)}
    </Svg>
  );
}

export default memo(Planet);
