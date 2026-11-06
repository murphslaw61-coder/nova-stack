#!/usr/bin/env python3
"""Synthesize all sound assets for Nova Stack.

Pure standard library (wave, struct, math, random) -- no numpy required.
Output: 16-bit PCM mono WAV files in assets/sounds/.

    python3 scripts/generate_sounds.py

Output is deterministic (fixed random seed).
"""

import math
import os
import random
import struct
import wave

SR = 44100          # SFX sample rate
MUSIC_SR = 22050    # music sample rate
SEED = 20261106

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "sounds")
OUT_DIR = os.path.normpath(OUT_DIR)

TWO_PI = 2.0 * math.pi

# Note frequencies
C5, D5, E5, G5, A5 = 523.25, 587.33, 659.25, 783.99, 880.00
C6, D6, E6, G6, A6 = 1046.50, 1174.66, 1318.51, 1567.98, 1760.00
C7, D7, E7 = 2093.00, 2349.32, 2637.02
A4 = 440.00
PENTA_HIGH = [C6, D6, E6, G6, A6, C7, D7, E7]


# --------------------------------------------------------------------------
# Basic buffer helpers
# --------------------------------------------------------------------------

def zeros(seconds, sr=SR):
    return [0.0] * int(round(seconds * sr))


def mix_into(dst, src, offset_s=0.0, gain=1.0, sr=SR):
    off = int(round(offset_s * sr))
    n = min(len(src), len(dst) - off)
    for i in range(max(0, n)):
        dst[off + i] += src[i] * gain
    return dst


def cents(c):
    return 2.0 ** (c / 1200.0)


def bell(freq, dur, sr=SR, ratios=(1.0, 2.0, 3.0, 4.2), amps=(1.0, 0.45, 0.25, 0.16),
         tau=0.35, attack=0.003, detune_c=2.0, strike=0.25):
    """Bell tone: inharmonic partials, higher partials decay faster, gentle chorus."""
    n = int(dur * sr)
    out = [0.0] * n
    nyq = sr * 0.45
    for r, a in zip(ratios, amps):
        f = freq * r
        if f * cents(detune_c) >= nyq:
            continue
        t_dec = tau / (r ** 0.9)
        k = math.exp(-1.0 / (t_dec * sr))
        for det in (-detune_c, detune_c):
            w = TWO_PI * f * cents(det) / sr
            ph = random.random() * 0.0  # start at zero phase (sine -> zero start)
            env = a * 0.5
            for i in range(n):
                out[i] += math.sin(ph) * env
                ph += w
                env *= k
    # strike transient: a quick high partial for "ting"
    if strike > 0:
        f = freq * 5.95
        if f < nyq:
            w = TWO_PI * f / sr
            k = math.exp(-1.0 / (0.012 * sr))
            env = strike
            for i in range(min(n, int(0.1 * sr))):
                out[i] += math.sin(w * i) * env
                env *= k
    apply_fade_in(out, attack, sr)
    return out


def one_pole_lp(x, cutoff, sr=SR):
    a = math.exp(-TWO_PI * cutoff / sr)
    b = 1.0 - a
    y = 0.0
    out = [0.0] * len(x)
    for i, v in enumerate(x):
        y = b * v + a * y
        out[i] = y
    return out


def one_pole_hp(x, cutoff, sr=SR):
    lp = one_pole_lp(x, cutoff, sr)
    return [a - b for a, b in zip(x, lp)]


def svf_bandpass(x, cutoff_fn, q=1.5, sr=SR):
    """Chamberlin state-variable band-pass with time-varying cutoff."""
    low = band = 0.0
    damp = 1.0 / q
    out = [0.0] * len(x)
    for i, v in enumerate(x):
        fc = min(cutoff_fn(i / sr), sr * 0.2)
        f = 2.0 * math.sin(math.pi * fc / sr)
        high = v - low - damp * band
        band += f * high
        low += f * band
        out[i] = band
    return out


def svf_lowpass(x, cutoff_fn, q=0.8, sr=SR):
    low = band = 0.0
    damp = 1.0 / q
    out = [0.0] * len(x)
    for i, v in enumerate(x):
        fc = min(cutoff_fn(i / sr), sr * 0.2)
        f = 2.0 * math.sin(math.pi * fc / sr)
        high = v - low - damp * band
        band += f * high
        low += f * band
        out[i] = low
    return out


def noise(seconds, sr=SR):
    return [random.uniform(-1.0, 1.0) for _ in range(int(seconds * sr))]


def reverb(x, sr=SR, wet=0.3, room=0.80, damp=0.35, tail=0.0):
    """Small Schroeder/Freeverb-style reverb: 4 damped combs + 2 allpasses."""
    src = list(x) + [0.0] * int(tail * sr)
    n = len(src)
    scale = sr / 44100.0
    comb_ms = (29.7, 37.1, 41.1, 43.7)
    wet_sum = [0.0] * n
    for d_ms in comb_ms:
        d = max(1, int(d_ms * 0.001 * 44100 * scale))
        buf = [0.0] * d
        idx = 0
        store = 0.0
        for i in range(n):
            o = buf[idx]
            store = o * (1.0 - damp) + store * damp
            buf[idx] = src[i] + store * room
            idx += 1
            if idx == d:
                idx = 0
            wet_sum[i] += o
    for d_ms, g in ((5.0, 0.6), (1.7, 0.6)):
        d = max(1, int(d_ms * 0.001 * 44100 * scale))
        buf = [0.0] * d
        idx = 0
        for i in range(n):
            bo = buf[idx]
            v = wet_sum[i]
            buf[idx] = v + bo * g
            wet_sum[i] = bo - v * g
            idx += 1
            if idx == d:
                idx = 0
    return [src[i] + wet * 0.25 * wet_sum[i] for i in range(n)]


def apply_fade_in(x, seconds, sr=SR):
    n = min(len(x), max(1, int(seconds * sr)))
    for i in range(n):
        x[i] *= 0.5 - 0.5 * math.cos(math.pi * i / n)
    return x


def apply_fade_out(x, seconds, sr=SR):
    n = min(len(x), max(2, int(seconds * sr)))
    L = len(x)
    for j in range(n):
        # last sample gets gain exactly 0
        g = 0.5 - 0.5 * math.cos(math.pi * j / (n - 1))
        x[L - 1 - j] *= g
    return x


def fit(x, seconds, sr=SR):
    n = int(round(seconds * sr))
    if len(x) >= n:
        return x[:n]
    return x + [0.0] * (n - len(x))


def remove_dc(x):
    m = sum(x) / len(x)
    return [v - m for v in x]


def normalize(x, peak_db):
    peak = max(abs(v) for v in x) or 1.0
    target = 10.0 ** (peak_db / 20.0)
    g = target / peak
    return [v * g for v in x]


def soft_clip(x, drive=1.0):
    return [math.tanh(v * drive) for v in x]


def finalize(x, seconds, sr=SR, peak_db=-1.0, fade_in=0.002, fade_out=0.03):
    x = fit(x, seconds, sr)
    x = remove_dc(x)
    x = normalize(x, peak_db)
    apply_fade_in(x, fade_in, sr)
    apply_fade_out(x, fade_out, sr)
    x[0] = 0.0
    x[-1] = 0.0
    return x


def write_wav(name, x, sr=SR):
    path = os.path.join(OUT_DIR, name)
    frames = bytearray()
    pack = struct.pack
    for v in x:
        s = int(round(max(-1.0, min(1.0, v)) * 32767.0))
        frames += pack("<h", s)
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(bytes(frames))
    return path


# --------------------------------------------------------------------------
# Sound designs
# --------------------------------------------------------------------------

def make_drop():
    dur = 0.12
    n = int(dur * SR)
    out = [0.0] * n
    ph = 0.0
    for i in range(n):
        t = i / SR
        f = 120.0 + 180.0 * math.exp(-t / 0.022)
        ph += TWO_PI * f / SR
        env = math.exp(-t / 0.042)
        out[i] = (math.sin(ph) + 0.18 * math.sin(2 * ph)) * env
    apply_fade_in(out, 0.0015)
    # tiny filtered noise click for the "thock"
    clk = noise(0.012)
    clk = one_pole_lp(clk, 3500)
    clk = one_pole_hp(clk, 600)
    for i in range(len(clk)):
        clk[i] *= math.exp(-i / (0.0018 * SR)) * 1.2
    apply_fade_in(clk, 0.0004)
    mix_into(out, clk)
    out = one_pole_lp(out, 5000)
    return finalize(out, dur, fade_out=0.02)


MERGE_NOTES = [C5, D5, E5, G5, A5, C6, D6, E6]


def make_merge(tier):
    f = MERGE_NOTES[tier - 1]
    dur = 0.30 + (tier - 1) * 0.0214     # 0.30 .. 0.45 s
    richness = (tier - 1) / 7.0
    ratios = [1.0, 2.0, 3.0, 4.2]
    amps = [1.0, 0.45, 0.26, 0.16]
    if tier >= 4:
        ratios.append(5.4)
        amps.append(0.08 + 0.05 * richness)
    if tier >= 6:
        ratios.append(6.8)
        amps.append(0.05 + 0.04 * richness)
    out = bell(f, dur, ratios=ratios, amps=amps, tau=0.16 + 0.08 * richness,
               detune_c=1.5 + 2.0 * richness, strike=0.2 + 0.1 * richness)
    # soft octave-below body for warmth
    body = bell(f * 0.5, dur, ratios=(1.0,), amps=(0.25,), tau=0.12, strike=0)
    mix_into(out, body)
    # higher tiers get a little sparkle octave above, slightly delayed
    if tier >= 5:
        sp = bell(f * 2.0, dur, ratios=(1.0, 3.0), amps=(0.18 * richness, 0.06),
                  tau=0.12, strike=0)
        mix_into(out, sp, 0.035)
    out = one_pole_lp(out, 9000)
    out = reverb(out, wet=0.35 + 0.25 * richness, room=0.78)
    return finalize(out, dur, fade_out=0.08)


def make_combo():
    dur = 0.45
    out = zeros(dur)
    notes = [G5, A5, C6, D6, E6]
    for k, f in enumerate(notes):
        b = bell(f, dur - k * 0.05, tau=0.09 + 0.02 * k, amps=(1.0, 0.4, 0.22, 0.14),
                 strike=0.3, detune_c=3.0)
        mix_into(out, b, k * 0.05, gain=0.75 + 0.06 * k)
    # glitter on top
    for k in range(6):
        t0 = 0.02 + k * 0.045 + random.uniform(0, 0.02)
        f = random.choice(PENTA_HIGH[3:])
        g = bell(f, 0.15, ratios=(1.0, 2.0), amps=(0.18, 0.05), tau=0.04, strike=0)
        mix_into(out, g, t0)
    out = one_pole_lp(out, 10000)
    out = reverb(out, wet=0.5, room=0.75)
    return finalize(out, dur, fade_out=0.07)


def make_flip():
    dur = 0.65
    n = int(dur * SR)

    def hump(t):  # 0 -> 1 -> 0 smooth over dur
        u = min(1.0, max(0.0, t / dur))
        return math.sin(math.pi * u) ** 1.5

    # whoosh: band-passed noise sweeping up then down
    nz = noise(dur)
    sweep = lambda t: 350.0 * (3500.0 / 350.0) ** (math.sin(math.pi * min(1.0, t / dur)) ** 1.2)
    w = svf_bandpass(nz, sweep, q=2.2)
    w2 = svf_bandpass(noise(dur), lambda t: sweep(t) * 1.5, q=3.0)
    whoosh = [0.0] * n
    for i in range(n):
        t = i / SR
        whoosh[i] = (w[i] + 0.5 * w2[i]) * hump(t)
    whoosh = one_pole_lp(whoosh, 6000)

    # wub: low sine rising then falling
    wub = [0.0] * n
    ph = 0.0
    for i in range(n):
        t = i / SR
        u = t / dur
        f = 70.0 + 110.0 * math.sin(math.pi * min(1.0, u * 1.1))
        ph += TWO_PI * f / SR
        env = math.sin(math.pi * u) ** 0.8
        wub[i] = (math.sin(ph) + 0.25 * math.sin(2 * ph + 0.3) + 0.08 * math.sin(3 * ph)) * env
    wub = one_pole_lp(wub, 900)

    pw = max(abs(v) for v in whoosh) or 1.0
    pb = max(abs(v) for v in wub) or 1.0
    out = [0.75 * whoosh[i] / pw + 0.8 * wub[i] / pb for i in range(n)]
    out = reverb(out, wet=0.25, room=0.7)
    return finalize(out, dur, fade_in=0.01, fade_out=0.06)


def sparkle_tail(dur, start, end, count, gain=0.25, lo=2, sr=SR):
    out = zeros(dur, sr)
    for k in range(count):
        t0 = start + (end - start) * (k / max(1, count - 1)) + random.uniform(-0.03, 0.03)
        t0 = max(0.0, t0)
        f = random.choice(PENTA_HIGH[lo:])
        g = gain * (1.0 - 0.6 * (t0 - start) / max(1e-6, end - start))
        b = bell(f, min(0.6, dur - t0), sr=sr, ratios=(1.0, 2.0, 3.0, 4.2),
                 amps=(1.0, 0.35, 0.18, 0.1), tau=0.18, strike=0.15, detune_c=4.0)
        mix_into(out, b, t0, g, sr)
    return out


def boom(dur, f_start, f_end, tau, drop_tau):
    n = int(dur * SR)
    out = [0.0] * n
    ph = 0.0
    for i in range(n):
        t = i / SR
        f = f_end + (f_start - f_end) * math.exp(-t / drop_tau)
        ph += TWO_PI * f / SR
        out[i] = (math.sin(ph) + 0.2 * math.sin(2 * ph)) * math.exp(-t / tau)
    apply_fade_in(out, 0.004)
    return out


def make_supernova():
    dur = 1.6
    n = int(dur * SR)
    sub = boom(dur, 110.0, 42.0, 0.45, 0.08)

    nz = noise(dur)
    burst = svf_lowpass(nz, lambda t: 250.0 + 5500.0 * math.exp(-t / 0.18), q=0.9)
    for i in range(n):
        burst[i] *= math.exp(-i / (0.28 * SR))
    apply_fade_in(burst, 0.003)

    # shimmering chord swell under the sparkles (C major add9 high)
    shimmer = zeros(dur)
    for f in (C6, E6, G6, D7):
        b = bell(f, dur - 0.08, tau=0.6, amps=(1.0, 0.3, 0.12, 0.06), strike=0.05, detune_c=6.0)
        apply_fade_in(b, 0.12)
        mix_into(shimmer, b, 0.08, 0.12)

    sparks = sparkle_tail(dur, 0.12, 1.05, 14, gain=0.28)
    tail = [shimmer[i] + sparks[i] for i in range(n)]
    tail = reverb(tail, wet=0.9, room=0.86, damp=0.25)

    out = [0.0] * n
    for i in range(n):
        out[i] = 1.0 * sub[i] + 0.45 * burst[i] + tail[i]
    return finalize(out, dur, fade_out=0.25)


def make_blast():
    dur = 1.0
    n = int(dur * SR)
    sub = boom(dur, 140.0, 48.0, 0.22, 0.05)

    # mid crunch: band-passed noise, saturated
    nz = noise(dur)
    crunch = svf_bandpass(nz, lambda t: 700.0 + 1600.0 * math.exp(-t / 0.08), q=1.2)
    for i in range(n):
        crunch[i] *= 3.0 * math.exp(-i / (0.12 * SR))
    crunch = soft_clip(crunch, 1.8)
    crunch = one_pole_lp(crunch, 4500)
    apply_fade_in(crunch, 0.002)

    burst = svf_lowpass(noise(dur), lambda t: 300.0 + 6000.0 * math.exp(-t / 0.1), q=0.9)
    for i in range(n):
        burst[i] *= math.exp(-i / (0.15 * SR))
    apply_fade_in(burst, 0.002)

    sparks = sparkle_tail(dur, 0.08, 0.6, 8, gain=0.22)
    sparks = reverb(sparks, wet=0.8, room=0.8)

    out = [0.0] * n
    for i in range(n):
        out[i] = 1.0 * sub[i] + 0.35 * crunch[i] + 0.35 * burst[i] + sparks[i]
    out = soft_clip(out, 1.2)
    return finalize(out, dur, fade_out=0.18)


def pad_note(freq, dur, sr=SR, attack=0.04, tau=0.5, detune_c=5.0):
    """Soft pad-ish tone: a few harmonics, detuned pair, gentle attack."""
    n = int(dur * sr)
    out = [0.0] * n
    harms = ((1, 1.0), (2, 0.22), (3, 0.07), (4, 0.03))
    k = math.exp(-1.0 / (tau * sr))
    for h, a in harms:
        for det in (-detune_c, detune_c):
            w = TWO_PI * freq * h * cents(det) / sr
            env = a * 0.5
            for i in range(n):
                out[i] += math.sin(w * i) * env
                env *= k
    apply_fade_in(out, attack, sr)
    return out


def make_gameover():
    dur = 1.1
    out = zeros(dur)
    seq = [(E5, 0.0, 0.40, 0.25), (C5, 0.28, 0.45, 0.28), (A4, 0.56, 0.54, 0.45)]
    for f, t0, d, tau in seq:
        p = pad_note(f, d, attack=0.035, tau=tau)
        apply_fade_out(p, 0.08)
        mix_into(out, p, t0)
        # soft low octave under each note
        lo = pad_note(f / 2, d, attack=0.05, tau=tau, detune_c=3.0)
        apply_fade_out(lo, 0.08)
        mix_into(out, lo, t0, 0.3)
    out = one_pole_lp(out, 2600)
    out = reverb(out, wet=0.55, room=0.82, damp=0.45)
    return finalize(out, dur, fade_in=0.004, fade_out=0.2)


def make_win():
    dur = 1.2
    out = zeros(dur)
    seq = [(C5, 0.0), (E5, 0.1), (G5, 0.2), (C6, 0.32)]
    for k, (f, t0) in enumerate(seq):
        last = k == len(seq) - 1
        b = bell(f, dur - t0, tau=0.45 if last else 0.2, amps=(1.0, 0.4, 0.22, 0.12),
                 strike=0.22, detune_c=3.0)
        mix_into(out, b, t0, 1.0 if last else 0.8)
        p = pad_note(f, dur - t0, attack=0.02, tau=0.6 if last else 0.25)
        mix_into(out, p, t0, 0.35)
    # sustaining warm chord bed after the arpeggio lands
    for f in (C5, E5, G5):
        p = pad_note(f, dur - 0.32, attack=0.08, tau=0.5, detune_c=7.0)
        mix_into(out, p, 0.32, 0.18)
    sparks = sparkle_tail(dur, 0.34, 0.85, 9, gain=0.22, lo=3)
    mix_into(out, sparks)
    out = one_pole_lp(out, 11000)
    out = reverb(out, wet=0.5, room=0.82)
    return finalize(out, dur, fade_out=0.22)


def make_tap():
    dur = 0.035
    n = int(dur * SR)
    out = [0.0] * n
    w = TWO_PI * 1800.0 / SR
    for i in range(n):
        env = math.exp(-i / (0.006 * SR))
        out[i] = (math.sin(w * i) + 0.15 * math.sin(2.0 * w * i)) * env
    apply_fade_in(out, 0.001)
    return finalize(out, dur, fade_in=0.001, fade_out=0.008)


def make_powerup():
    dur = 0.6
    n = int(dur * SR)
    out = [0.0] * n
    ph1 = ph2 = 0.0
    for i in range(n):
        t = i / SR
        u = t / dur
        f = 300.0 * (4.0 ** min(1.0, u / 0.85))
        vib = 1.0 + 0.012 * math.sin(TWO_PI * 11.0 * t)
        ph1 += TWO_PI * f * vib / SR
        ph2 += TWO_PI * f * 1.5 * cents(4) * vib / SR
        env = (min(1.0, u / 0.15)) * (1.0 - u) ** 0.7
        out[i] = (math.sin(ph1) + 0.3 * math.sin(ph2) + 0.12 * math.sin(2 * ph1)) * env
    apply_fade_in(out, 0.01)
    out = one_pole_lp(out, 7000)
    # rising sparkles
    pitches = [G5, A5, C6, D6, E6, G6, A6, C7]
    for k, f in enumerate(pitches):
        t0 = 0.05 + k * 0.055 + random.uniform(0, 0.015)
        b = bell(f, 0.2, ratios=(1.0, 2.0, 3.0), amps=(1.0, 0.3, 0.15), tau=0.06, strike=0.2)
        mix_into(out, b, t0, 0.22 + 0.03 * k)
    out = reverb(out, wet=0.45, room=0.78)
    return finalize(out, dur, fade_out=0.1)


def make_warn():
    dur = 0.32
    out = zeros(dur)

    def bloop(f0):
        d = 0.13
        m = int(d * SR)
        b = [0.0] * m
        ph = 0.0
        for i in range(m):
            t = i / SR
            f = f0 * (0.9 + 0.12 * math.exp(-t / 0.02))
            ph += TWO_PI * f / SR
            env = math.exp(-t / 0.045)
            b[i] = (math.sin(ph) + 0.12 * math.sin(2 * ph)) * env
        apply_fade_in(b, 0.004)
        apply_fade_out(b, 0.02)
        return b

    mix_into(out, bloop(720.0), 0.0)
    mix_into(out, bloop(720.0), 0.16, 0.9)
    out = one_pole_lp(out, 4000)
    out = reverb(out, wet=0.15, room=0.6)
    return finalize(out, dur, fade_out=0.03)


def make_unlock():
    dur = 0.7
    out = zeros(dur)
    b1 = bell(G5, dur, tau=0.3, amps=(1.0, 0.45, 0.25, 0.16, 0.08),
              ratios=(1.0, 2.0, 3.0, 4.2, 5.4), strike=0.3, detune_c=2.5)
    b2 = bell(D6, dur - 0.14, tau=0.4, amps=(1.0, 0.45, 0.25, 0.16, 0.08),
              ratios=(1.0, 2.0, 3.0, 4.2, 5.4), strike=0.3, detune_c=2.5)
    mix_into(out, b1, 0.0, 0.85)
    mix_into(out, b2, 0.14, 1.0)
    sp = sparkle_tail(dur, 0.18, 0.45, 4, gain=0.12, lo=4)
    mix_into(out, sp)
    out = one_pole_lp(out, 10000)
    out = reverb(out, wet=0.5, room=0.8)
    return finalize(out, dur, fade_out=0.12)


# --------------------------------------------------------------------------
# Ambient music loop
# --------------------------------------------------------------------------

def make_music():
    sr = MUSIC_SR
    loop_s = 32.0
    tail_s = 6.0
    N = int(loop_s * sr)
    total = int((loop_s + tail_s) * sr)
    pad = [0.0] * total

    # wavetable: soft "triangle-ish" (fundamental + weak odd harmonics)
    TBL = 4096
    table = [math.sin(TWO_PI * i / TBL) + math.sin(3 * TWO_PI * i / TBL) / 18.0
             + math.sin(5 * TWO_PI * i / TBL) / 60.0 for i in range(TBL)]
    table.append(table[0])

    def mf(m):
        return 440.0 * 2.0 ** ((m - 69) / 12.0)

    # Cmaj9 -> Am9 -> Fmaj7 -> Gsus (MIDI notes)
    chords = [
        [36, 48, 55, 64, 71, 74],   # C2 C3 G3 E4 B4 D5
        [33, 45, 52, 60, 67, 71],   # A1 A2 E3 C4 G4 B4
        [29, 41, 48, 57, 64, 69],   # F1 F2 C3 A3 E4 A4
        [31, 43, 50, 60, 62, 67],   # G1 G2 D3 C4 D4 G4
    ]
    chord_len = 8.0
    attack = 2.5
    release = 3.5
    for ci, notes in enumerate(chords):
        start = ci * chord_len
        note_len = chord_len + release
        n0 = int(start * sr)
        m = int(note_len * sr)
        sus_end = chord_len
        for ni, midi in enumerate(notes):
            f = mf(midi)
            if midi < 40:
                amp = 0.32
            elif midi < 50:
                amp = 0.30
            else:
                amp = 0.20 - 0.012 * (ni - 2)
            for det in (-6.0, 0.0, 6.0):
                inc = f * cents(det) * TBL / sr
                ph = random.random() * TBL
                # slow per-voice amplitude shimmer
                lfo_rate = 0.07 + random.random() * 0.08
                lfo_ph = random.random() * TWO_PI
                a = amp / 3.0
                for i in range(m):
                    t = i / sr
                    if t < attack:
                        env = 0.5 - 0.5 * math.cos(math.pi * t / attack)
                    elif t < sus_end:
                        env = 1.0
                    else:
                        env = 0.5 + 0.5 * math.cos(math.pi * (t - sus_end) / release)
                    ip = int(ph)
                    fr = ph - ip
                    s = table[ip] + (table[ip + 1] - table[ip]) * fr
                    lfo = 0.85 + 0.15 * math.sin(lfo_ph + TWO_PI * lfo_rate * t)
                    pad[n0 + i] += s * env * lfo * a
                    ph += inc
                    if ph >= TBL:
                        ph -= TBL

    pad = one_pole_lp(pad, 1800, sr)
    pad = one_pole_lp(pad, 3500, sr)

    # sparse soft "stars": high bell pings at deterministic random times
    stars = [0.0] * total
    star_scale = [72, 74, 76, 79, 81, 84, 86, 88]  # C pentatonic C5..E6
    chord_tones = [
        [74, 76, 79, 83, 86],
        [72, 76, 79, 81, 83, 84],
        [72, 76, 77, 81, 84],
        [74, 79, 81, 84, 86],
    ]
    t = 1.3
    while t < loop_s - 0.5:
        ci = int(t // chord_len)
        midi = random.choice([m for m in chord_tones[ci] if m in star_scale] or star_scale)
        b = bell(mf(midi), 2.5, sr=sr, ratios=(1.0, 2.0, 3.0, 4.2),
                 amps=(1.0, 0.3, 0.12, 0.06), tau=0.9, attack=0.01, strike=0.05, detune_c=3.0)
        mix_into(stars, b, t, 0.06 + random.random() * 0.03, sr)
        t += random.uniform(2.2, 4.8)
    stars = reverb(stars, sr=sr, wet=1.0, room=0.88, damp=0.3)[:total]

    mixbuf = [pad[i] + stars[i] for i in range(total)]
    # wrap tail around onto the beginning for a seamless loop
    out = mixbuf[:N]
    for i in range(N, total):
        out[i - N] += mixbuf[i]
    out = remove_dc(out)
    out = normalize(out, -6.0)
    return out


# --------------------------------------------------------------------------

EXPECTED = {
    "drop.wav": (SR, 0.12),
    "merge_1.wav": (SR, 0.30), "merge_2.wav": (SR, 0.3214), "merge_3.wav": (SR, 0.3428),
    "merge_4.wav": (SR, 0.3642), "merge_5.wav": (SR, 0.3856), "merge_6.wav": (SR, 0.407),
    "merge_7.wav": (SR, 0.4284), "merge_8.wav": (SR, 0.4498),
    "combo.wav": (SR, 0.45),
    "flip.wav": (SR, 0.65),
    "supernova.wav": (SR, 1.6),
    "blast.wav": (SR, 1.0),
    "gameover.wav": (SR, 1.1),
    "win.wav": (SR, 1.2),
    "tap.wav": (SR, 0.035),
    "powerup.wav": (SR, 0.6),
    "warn.wav": (SR, 0.32),
    "unlock.wav": (SR, 0.7),
    "music_loop.wav": (MUSIC_SR, 32.0),
}


def verify():
    print("\n%-16s %6s %9s %10s" % ("file", "rate", "duration", "bytes"))
    ok = True
    for name, (rate, dur) in EXPECTED.items():
        path = os.path.join(OUT_DIR, name)
        with wave.open(path, "rb") as w:
            r = w.getframerate()
            frames = w.getnframes()
            ch = w.getnchannels()
            sw = w.getsampwidth()
            data = w.readframes(frames)
        d = frames / float(r)
        first = struct.unpack_from("<h", data, 0)[0]
        last = struct.unpack_from("<h", data, len(data) - 2)[0]
        good = r == rate and ch == 1 and sw == 2 and abs(d - dur) < 0.002
        if name != "music_loop.wav":
            good = good and first == 0 and last == 0
        ok &= good
        print("%-16s %6d %8.3fs %10d %s" % (name, r, d, os.path.getsize(path),
                                             "" if good else "  <-- MISMATCH"))
    print("\nall OK" if ok else "\nVERIFY FAILED")
    return ok


def main():
    random.seed(SEED)
    os.makedirs(OUT_DIR, exist_ok=True)
    jobs = [("drop.wav", make_drop)]
    for t in range(1, 9):
        jobs.append(("merge_%d.wav" % t, (lambda tt: (lambda: make_merge(tt)))(t)))
    jobs += [
        ("combo.wav", make_combo),
        ("flip.wav", make_flip),
        ("supernova.wav", make_supernova),
        ("blast.wav", make_blast),
        ("gameover.wav", make_gameover),
        ("win.wav", make_win),
        ("tap.wav", make_tap),
        ("powerup.wav", make_powerup),
        ("warn.wav", make_warn),
        ("unlock.wav", make_unlock),
    ]
    for name, fn in jobs:
        write_wav(name, fn(), SR)
        print("wrote", name)
    write_wav("music_loop.wav", make_music(), MUSIC_SR)
    print("wrote music_loop.wav")
    verify()


if __name__ == "__main__":
    main()
