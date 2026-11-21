# HELL GATE — generate the voice lines of Missions 2-6 with Piper TTS (offline).
# The lines are read straight out of the mission scripts (hg/m2_stash.js ... hg/m6_burn.js):
#   this.say('KEY', "text"), this.sayAsync('KEY', "text"), ln(t, 'KEY', "text"), guard barks { hear: "..." },
#   this.bark(actor, "text", 'KEY')  — so subtitles and audio can never drift apart.
# Run:  python make_vo_m2_6.py "<game folder>" "<folder with the .onnx voices>"
# Voices (Hugging Face rhasspy/piper-voices): en_US ryan-high, norman, kristin, joe, bryce, amy (medium), danny (low), en_GB alba (medium).
# Writes audio/vo_hg/m<N>_<hash>.mp3 and hg/vo_m2_6.js. Needs ffmpeg on PATH.
import wave, os, re, sys, json, subprocess, hashlib
from piper import PiperVoice, SynthesisConfig

GAME, VDIR = sys.argv[1], sys.argv[2]
OUT = os.path.join(GAME, 'audio', 'vo_hg'); os.makedirs(OUT, exist_ok=True)
TMP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_vo_tmp'); os.makedirs(TMP, exist_ok=True)
FILES = {'ryan': 'en_US-ryan-high.onnx', 'norman': 'en_US-norman-medium.onnx', 'kristin': 'en_US-kristin-medium.onnx', 'joe': 'en_US-joe-medium.onnx',
         'bryce': 'en_US-bryce-medium.onnx', 'amy': 'en_US-amy-medium.onnx', 'danny': 'en_US-danny-low.onnx', 'alba': 'en_GB-alba-medium.onnx'}
V = {k: PiperVoice.load(os.path.join(VDIR, f)) for k, f in FILES.items()}
RADIO = ',highpass=f=420,lowpass=f=2900,acompressor=threshold=0.15:ratio=6:makeup=2,acrusher=bits=10:mix=0.25'
EAR = ',highpass=f=280,lowpass=f=3600,acompressor=threshold=0.2:ratio=4:makeup=2,acrusher=bits=12:mix=0.12'
PHONE = ',highpass=f=480,lowpass=f=3100,acompressor=threshold=0.2:ratio=5:makeup=2'
PA = ',aecho=0.8:0.55:45|90:0.25|0.15'
P = {   # speaker: voice, length (pace), pitch semitones, extra ffmpeg filter
    'ELI': ('ryan', 1.02, -.6, ''),
    'DEACON': ('bryce', 1.1, -1.4, ''),
    'SOF': ('kristin', .95, -1.2, ''),
    'STATIC': ('danny', .9, .5, EAR),
    'GALINA': ('alba', 1.1, -3.0, ''),
    'GALINA_PHONE': ('alba', 1.1, -3.0, PHONE),
    'IRIS': ('amy', 1.0, -.6, ''),
    'KESSLER_RADIO': ('alba', .97, -1.2, RADIO),
    'CRANE': ('norman', 1.12, -2.5, PA),
    'LUCIA': ('kristin', 1.02, 2.0, ''),
    'HAROLD': ('norman', .94, 1.2, ''),
    'VIKTOR': ('joe', 1.1, -3.2, ''),
    'WAITER': ('joe', .9, 1.6, ''),
    'THUG': ('joe', .95, -2.0, ''),
    'CO': ('joe', .98, 1.0, ''),
    'CO2': ('joe', .96, -.8, RADIO),
    'BRATVA': ('bryce', .95, -2.8, ''),
    'HALCYON': ('bryce', .94, -1.4, ''),
}
CROWD = [('joe', -2.0, 0), ('norman', 0, .07), ('kristin', 1.0, .12), ('amy', -.5, .04), ('bryce', -3.0, .1), ('ryan', 1.5, .16)]   # "Gorko!" — a room shouting
FACTION = {2: 'THUG', 3: 'CO', 4: 'BRATVA', 5: 'HALCYON', 6: 'HALCYON'}
SRC = {2: 'm2_stash.js', 3: 'm3_traffic.js', 4: 'm4_watch.js', 5: 'm5_glass.js', 6: 'm6_burn.js'}

def lines_of(n):
    s = open(os.path.join(GAME, 'hg', SRC[n]), encoding='utf-8').read(); out = []
    for k, t in re.findall(r"this\.say(?:Async)?\('(\w+)',\s*\"([^\"]+)\"", s): out.append((k, t))
    for k, t in re.findall(r"ln\([\d.]+,\s*'(\w+)',\s*\"([^\"]+)\"", s): out.append((k, t))
    for body in re.findall(r"bark\s*=\s*\{([^}]*)\}", s):
        for t in re.findall(r"\w+:\s*\"([^\"]+)\"", body): out.append((FACTION[n], t))
    for t, k in re.findall(r"this\.bark\([\w.\[\]]+,\s*\"([^\"]+)\"(?:,\s*'(\w+)')?\)", s): out.append((k or FACTION[n], t))
    seen, res = set(), []
    for k, t in out:
        if t not in seen: seen.add(t); res.append((k, t))
    return res

def synth(voice, text, ls, name):
    wav = os.path.join(TMP, name + '.wav')
    with wave.open(wav, 'wb') as w: V[voice].synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=ls, noise_scale=.62, noise_w_scale=.8))
    return wav, V[voice].config.sample_rate
def shift(sr, st): f = 2 ** (st / 12); return f'asetrate={int(sr * f)},aresample=22050,atempo={1 / f:.4f}' if st else 'aresample=22050'
TRIM = ',silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.15,loudnorm=I=-16:TP=-1.5'
def finish(mp3):
    return round(float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3], capture_output=True, text=True).stdout), 2)
def render(text, sp, name):
    mp3 = os.path.join(OUT, name + '.mp3')
    if sp == 'ALL':
        ins, fl = [], []
        for i, (v, st, delay) in enumerate(CROWD):
            wav, sr = synth(v, text, .95 + i * .03, f'{name}_{i}'); ins += ['-i', wav]
            fl.append(f'[{i}:a]{shift(sr, st)},adelay={int(delay * 1000)},volume=0.8[a{i}]')
        fl.append(''.join(f'[a{i}]' for i in range(len(CROWD))) + f'amix=inputs={len(CROWD)}:normalize=0,aecho=0.8:0.6:50|110:0.3|0.2' + TRIM + '[o]')
        subprocess.run(['ffmpeg', '-y', '-v', 'error', *ins, '-filter_complex', ';'.join(fl), '-map', '[o]', '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', '64k', mp3], check=True)
    else:
        v, ls, st, extra = P[sp]
        wav, sr = synth(v, text, ls, name)
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-af', shift(sr, st) + extra + TRIM, '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', '64k', mp3], check=True)
    return 'audio/vo_hg/' + name + '.mp3', finish(mp3)

out = {}
for n in sorted(SRC):
    for sp, text in lines_of(n):
        if sp not in P and sp != 'ALL': print('!! no voice for', sp, text); continue
        f, d = render(text, sp, f'm{n}_' + hashlib.md5((sp + text).encode()).hexdigest()[:8])
        out[text] = {'f': f, 'd': d, 'who': sp, 'm': n}
        print(f'm{n} {d:5.2f}s {sp:14s} {text}')
open(os.path.join(GAME, 'hg', 'vo_m2_6.js'), 'w', encoding='utf-8').write(
    "'use strict';\n// Generated by tools/make_vo_m2_6.py — HELL GATE Missions 2-6 voice lines (Piper TTS).\n// key = the subtitle text; f = file; d = seconds; who = speaker; m = mission.\nObject.assign(VO_DATA.lines, " + json.dumps(out, indent=1, ensure_ascii=False) + ");\n")
print('done', len(out))
