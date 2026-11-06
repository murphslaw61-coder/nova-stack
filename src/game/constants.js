export const COLORS = {
  bg0: '#04050C',
  bg1: '#0A0D24',
  bg2: '#151A3D',
  panel: 'rgba(18,22,52,0.78)',
  panelSolid: '#12163A',
  panelHi: 'rgba(40,48,110,0.55)',
  stroke: 'rgba(150,170,255,0.16)',
  strokeHi: 'rgba(150,170,255,0.35)',
  nebula: '#7C5CFF',
  violet: '#A98BFF',
  cyan: '#3EE6F2',
  gold: '#FFCF5A',
  orange: '#FF9A3D',
  coral: '#FF5C7A',
  green: '#5CFFB0',
  text: '#F3F5FF',
  textDim: '#8E96BD',
  textFaint: '#5A6188',
};

export const FONTS = {
  display: 'Orbitron_800ExtraBold',
  displayMid: 'Orbitron_600SemiBold',
  body: 'Exo2_500Medium',
  bodyBold: 'Exo2_700Bold',
  bodyBlack: 'Exo2_800ExtraBold',
};

export const TIER_NAMES = [null, 'Asteroid', 'Moon', 'Mercury', 'Mars', 'Earth', 'Neptune', 'Saturn', 'Supernova', 'Dark Matter'];

export const MODE_META = [
  { key: 'endless', icon: '∞', name: 'Endless', desc: 'The classic run. Survive the flips as long as you can.', color: COLORS.cyan },
  { key: 'daily', icon: '☀', name: 'Daily', desc: 'One board for everyone, new every day. Keep your streak.', color: COLORS.gold },
  { key: 'weekly', icon: '✦', name: 'Weekly', desc: 'A new rule twist each week.', color: COLORS.violet },
  { key: 'puzzle', icon: '◈', name: 'Puzzles', desc: '30 hand-tuned levels. Earn 3 stars on each.', color: COLORS.green },
  { key: 'zen', icon: '☾', name: 'Zen', desc: 'No flips, no game over. Just merge.', color: '#8FB8FF' },
  { key: 'extreme', icon: '☠', name: 'Extreme', desc: 'Smaller board, flips every 4 drops, no power-ups.', color: COLORS.coral },
];
export const modeMeta = (key) => MODE_META.find((m) => m.key === key) || MODE_META[0];

export const POWERUPS = [
  { key: 'bomb', icon: '✸', name: 'Bomb', desc: 'Tap an orb to blast it and its 4 neighbours.', color: COLORS.coral },
  { key: 'shuffle', icon: '⟲', name: 'Shuffle', desc: 'Reshuffle every orb on the board.', color: COLORS.violet },
  { key: 'lock', icon: '⛨', name: 'Lock', desc: 'Block the next gravity flip.', color: COLORS.cyan },
  { key: 'flip', icon: '⧗', name: 'Delay', desc: 'Push the next flip back 3 drops.', color: COLORS.gold },
];
