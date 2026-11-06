// Planet palettes per skin. Each tier: body gradient (light → mid → dark),
// two feature colours (craters, continents, bands…), rim light and glow.
const cosmic = {
  1: { light: '#B9B2A6', mid: '#7D766C', dark: '#3F3A34', f1: '#5E584F', f2: '#CFC8BC', rim: '#E8E2D6', glow: null },
  2: { light: '#FFFFFF', mid: '#CFD3DC', dark: '#6F7584', f1: '#A9AEBB', f2: '#E9ECF2', rim: '#FFFFFF', glow: null },
  3: { light: '#F1C79A', mid: '#B5835A', dark: '#5A3A22', f1: '#8C603E', f2: '#E0B285', rim: '#FFE1C2', glow: null },
  4: { light: '#FF9F75', mid: '#D2512A', dark: '#6B1F0E', f1: '#A33A1C', f2: '#FFFFFF', rim: '#FFB28F', glow: null },
  5: { light: '#7FD3FF', mid: '#2477C8', dark: '#0B2A5E', f1: '#3FBF6A', f2: '#FFFFFF', rim: '#A8F0FF', glow: '#4FC3FF' },
  6: { light: '#8FA6FF', mid: '#3550D6', dark: '#101B66', f1: '#5A74F0', f2: '#1A2A8A', rim: '#B9C6FF', glow: '#5A74FF' },
  7: { light: '#FFE3A1', mid: '#D9A24A', dark: '#7A4E14', f1: '#C08A3A', f2: '#F3D08A', rim: '#FFF0C8', glow: '#FFC85A' },
  8: { light: '#FFFFFF', mid: '#FFE27A', dark: '#FF6A2B', f1: '#FFB13D', f2: '#FFF6D0', rim: '#FFFFFF', glow: '#FF9A3D' },
};

const golden = {
  1: { light: '#E0B48A', mid: '#9C6B48', dark: '#4A2C1A', f1: '#7A4F33', f2: '#F0CFA8', rim: '#FFE0C0', glow: null },
  2: { light: '#FFF4DE', mid: '#F2C9A0', dark: '#9C6A4A', f1: '#D9A880', f2: '#FFF0DC', rim: '#FFFFFF', glow: null },
  3: { light: '#FFD39A', mid: '#E58F4A', dark: '#7A3A12', f1: '#C06A2E', f2: '#FFE2B8', rim: '#FFE6C8', glow: null },
  4: { light: '#FFAA8A', mid: '#E0543E', dark: '#6E1A1E', f1: '#B23A2E', f2: '#FFE0C8', rim: '#FFC2A8', glow: null },
  5: { light: '#FFB8C8', mid: '#D8577E', dark: '#5E1638', f1: '#FFB15C', f2: '#FFF0E0', rim: '#FFD0DE', glow: '#FF7FA0' },
  6: { light: '#E4A8FF', mid: '#9A4FD0', dark: '#3A1260', f1: '#C27AF0', f2: '#55208A', rim: '#F0D0FF', glow: '#C27AF0' },
  7: { light: '#FFF0B0', mid: '#F2B33A', dark: '#8A4A08', f1: '#E09A2A', f2: '#FFE08A', rim: '#FFF6D8', glow: '#FFD050' },
  8: { light: '#FFFFFF', mid: '#FFD27A', dark: '#FF4A6A', f1: '#FF8A4A', f2: '#FFF2D8', rim: '#FFFFFF', glow: '#FF6A6A' },
};

const neon = {
  1: { light: '#2A2F45', mid: '#171A2A', dark: '#07080F', f1: '#7DF9FF', f2: '#7DF9FF', rim: '#7DF9FF', glow: '#29D9FF' },
  2: { light: '#2C2A45', mid: '#18162A', dark: '#08070F', f1: '#C9A4FF', f2: '#C9A4FF', rim: '#C9A4FF', glow: '#9A5CFF' },
  3: { light: '#3A2A2A', mid: '#1E1416', dark: '#0A0607', f1: '#FFB86B', f2: '#FFB86B', rim: '#FFB86B', glow: '#FF8A2B' },
  4: { light: '#3A1E2A', mid: '#1E0E16', dark: '#0A0408', f1: '#FF4F8B', f2: '#FF9FC0', rim: '#FF4F8B', glow: '#FF2D6F' },
  5: { light: '#1E3A36', mid: '#0E1E1C', dark: '#040A09', f1: '#3DFFB5', f2: '#A8FFE0', rim: '#3DFFB5', glow: '#18F5A0' },
  6: { light: '#1E2A4A', mid: '#0E1426', dark: '#04060E', f1: '#4F8BFF', f2: '#9FC0FF', rim: '#4F8BFF', glow: '#2D6FFF' },
  7: { light: '#3A361E', mid: '#1E1A0E', dark: '#0A0904', f1: '#FFE94F', f2: '#FFF5A8', rim: '#FFE94F', glow: '#FFD92D' },
  8: { light: '#FFFFFF', mid: '#FF9FF5', dark: '#7A2DFF', f1: '#FF5CF0', f2: '#FFFFFF', rim: '#FFFFFF', glow: '#FF4FE8' },
};

export const SKINS = {
  cosmic: { id: 'cosmic', name: 'Cosmic', desc: 'The classic solar system.', palette: cosmic, neon: false, free: true },
  golden: { id: 'golden', name: 'Golden Hour', desc: 'Warm sunset tones on every planet.', palette: golden, neon: false, entitlement: 'skin_golden' },
  neon: { id: 'neon', name: 'Neon Void', desc: 'Glowing synthwave outlines.', palette: neon, neon: true, entitlement: 'skin_neon' },
};
export const SKIN_ORDER = ['cosmic', 'golden', 'neon'];
export const skinById = (id) => SKINS[id] || SKINS.cosmic;
