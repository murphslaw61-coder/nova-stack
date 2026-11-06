// Sound effects + ambient music via expo-audio. Each effect gets a small
// player pool so rapid cascades can overlap instead of cutting each other off.
import { AppState } from 'react-native';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const FILES = {
  drop: require('../../assets/sounds/drop.wav'),
  merge_1: require('../../assets/sounds/merge_1.wav'),
  merge_2: require('../../assets/sounds/merge_2.wav'),
  merge_3: require('../../assets/sounds/merge_3.wav'),
  merge_4: require('../../assets/sounds/merge_4.wav'),
  merge_5: require('../../assets/sounds/merge_5.wav'),
  merge_6: require('../../assets/sounds/merge_6.wav'),
  merge_7: require('../../assets/sounds/merge_7.wav'),
  merge_8: require('../../assets/sounds/merge_8.wav'),
  combo: require('../../assets/sounds/combo.wav'),
  flip: require('../../assets/sounds/flip.wav'),
  supernova: require('../../assets/sounds/supernova.wav'),
  blast: require('../../assets/sounds/blast.wav'),
  gameover: require('../../assets/sounds/gameover.wav'),
  win: require('../../assets/sounds/win.wav'),
  tap: require('../../assets/sounds/tap.wav'),
  powerup: require('../../assets/sounds/powerup.wav'),
  warn: require('../../assets/sounds/warn.wav'),
  unlock: require('../../assets/sounds/unlock.wav'),
};
const POOL = { drop: 3, tap: 2, merge_1: 2, merge_2: 2, merge_3: 2, merge_4: 2 };
const VOLUME = { tap: 0.5, drop: 0.8, warn: 0.6 };

let pools = {};
let cursor = {};
let music = null;
let ready = false;
let soundOn = true;
let musicOn = true;
let musicWanted = false;

export async function initAudio({ sound = true, music: m = true } = {}) {
  soundOn = sound;
  musicOn = m;
  if (ready) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' });
  } catch (e) {}
  try {
    for (const [key, src] of Object.entries(FILES)) {
      pools[key] = Array.from({ length: POOL[key] || 1 }, () => {
        const p = createAudioPlayer(src);
        p.volume = VOLUME[key] ?? 1;
        return p;
      });
      cursor[key] = 0;
    }
    music = createAudioPlayer(require('../../assets/sounds/music_loop.wav'));
    music.loop = true;
    music.volume = 0.32;
    ready = true;
    if (musicWanted) startMusic();
  } catch (e) {
    // Missing audio hardware should never break the game.
  }
}

AppState.addEventListener('change', (s) => {
  if (!music) return;
  try {
    if (s === 'active') { if (musicWanted && musicOn) music.play(); } else music.pause();
  } catch (e) {}
});

export function setSoundEnabled(on) { soundOn = on; }
export function setMusicEnabled(on) {
  musicOn = on;
  if (!music) return;
  try { if (on && musicWanted) music.play(); else music.pause(); } catch (e) {}
}
export function startMusic() {
  musicWanted = true;
  if (!ready || !musicOn || !music) return;
  try { music.play(); } catch (e) {}
}

export function play(key) {
  if (!soundOn || !ready || !pools[key]) return;
  const pool = pools[key];
  const p = pool[cursor[key] % pool.length];
  cursor[key]++;
  try {
    const r = p.seekTo(0);
    if (r && r.catch) r.catch(() => {});
    p.play();
  } catch (e) {}
}

export const sfx = {
  drop: () => play('drop'),
  merge: (tier) => play(`merge_${Math.max(1, Math.min(8, tier))}`),
  combo: () => play('combo'),
  flip: () => play('flip'),
  supernova: () => play('supernova'),
  blast: () => play('blast'),
  gameover: () => play('gameover'),
  win: () => play('win'),
  tap: () => play('tap'),
  powerup: () => play('powerup'),
  warn: () => play('warn'),
  unlock: () => play('unlock'),
};
