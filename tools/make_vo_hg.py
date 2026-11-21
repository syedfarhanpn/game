# HELL GATE — generate the Mission 1 ("Delphine") voice lines with Piper TTS (offline).
# Run:  python make_vo_hg.py "<game folder>" "<folder with the .onnx voices>"
# Voices (Hugging Face rhasspy/piper-voices): en_US-ryan-high (Eli), en_US-norman-medium (Rafael),
# en_US-kristin-medium (Nia, pitched up), en_US-joe-medium (captain / dispatch). Needs ffmpeg on PATH.
import wave, os, sys, json, subprocess, hashlib
from piper import PiperVoice, SynthesisConfig

GAME, VDIR = sys.argv[1], sys.argv[2]
OUT = os.path.join(GAME, 'audio', 'vo_hg'); os.makedirs(OUT, exist_ok=True)
TMP = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_vo_tmp'); os.makedirs(TMP, exist_ok=True)
V = {k: PiperVoice.load(os.path.join(VDIR, f)) for k, f in
     {'ryan': 'en_US-ryan-high.onnx', 'norman': 'en_US-norman-medium.onnx', 'kristin': 'en_US-kristin-medium.onnx', 'joe': 'en_US-joe-medium.onnx'}.items()}
RADIO = ',highpass=f=420,lowpass=f=2900,acompressor=threshold=0.15:ratio=6:makeup=2,acrusher=bits=10:mix=0.25'
P = {   # speaker: voice, length (pace), pitch semitones, extra ffmpeg filter
    'ELI': ('ryan', 1.02, -.6, ''),
    'RAFAEL': ('norman', 1.0, -1.2, ''),
    'RAFAEL_RADIO': ('norman', 1.0, -1.2, RADIO),
    'NIA': ('kristin', 1.04, 4.2, ''),
    'NIA_FAR': ('kristin', 1.0, 4.2, ',lowpass=f=1500,aecho=0.8:0.7:60|140:0.4|0.25,volume=0.8'),
    'CAPTAIN': ('joe', 1.0, -2.0, ''),
    'CAPTAIN_RADIO': ('joe', .97, -2.0, RADIO),
    'DISPATCH': ('joe', .95, 1.2, RADIO),
}
LINES = [  # (speaker preset, line) — the line text is the subtitle and the lookup key
    ('DISPATCH', "All units, Red Hook. Surge is still rising. Red Hook Houses, building seven. Callers trapped on the second floor."),
    ('CAPTAIN', "You get two minutes in there, then I'm pulling you out. This whole block is going under."),
    ('RAFAEL', "Stay on my line, Navarro. In and out. Nobody's a hero tonight."),
    ('ELI', "In and out."),
    ('RAFAEL', "Masks on. Let's go."),
    ('RAFAEL', "Lobby door's under. We go down and through. Stay on my light."),
    ('RAFAEL', "Clear. Up to two. I'll take the east side, you take west. Call it out."),
    ('ELI', "West side's empty. Nobody home."),
    ('RAFAEL_RADIO', "East is cut off. The ceiling came down in the hall."),
    ('CAPTAIN_RADIO', "Duarte! Navarro! The building's shifting and the water's still coming. Get out, now!"),
    ('RAFAEL', "You heard him. We're done. Back to the boat."),
    ('NIA_FAR', "Help! Somebody, please! I'm in here!"),
    ('ELI', "Rafa. There's a kid. East end, past the collapse."),
    ('RAFAEL', "Eli, the captain called it. We go. That's an order."),
    ('ELI', "Then write me up."),
    ('RAFAEL', "Eli! Dammit, Eli!"),
    ('NIA_FAR', "Is somebody there?"),
    ('ELI', "I'm here. Stand back from the door."),
    ('ELI', "Hey. Hey, look at me. What's your name?"),
    ('NIA', "Nia."),
    ('ELI', "Nia, I'm Eli. I swim for a living. You ever hold your breath in a pool?"),
    ('NIA', "Yeah. At camp."),
    ('ELI', "Good. That's all we're gonna do. Hold on to me, and don't let go."),
    ('ELI', "Big breath, Nia. Now."),
    ('ELI', "Almost there. Stay with me."),
    ('ELI', "Breathe. You're doing great."),
    ('CAPTAIN_RADIO', "I've got Navarro! He's got a kid! Bring her in, bring her in!"),
    ('CAPTAIN', "We got her. We got her. Where's Duarte? Navarro, where's your partner?"),
    ('RAFAEL_RADIO', "Eli... I came in after you. The hallway came down. I'm pinned, I can't..."),
    ('ELI', "Rafa! Hold on, I'm coming!"),
    ('CAPTAIN_RADIO', "Navarro! It's all coming down! Get out of the water!"),
    ('ELI', "Rafa!"),
    ('CAPTAIN', "I got you. I got you. He's gone, son. He's gone."),
    ('RAFAEL', "Navarro, on me."),
]
def render(text, sp, name):
    v, ls, st, extra = P[sp]
    wav = os.path.join(TMP, name + '.wav')
    with wave.open(wav, 'wb') as w: V[v].synthesize_wav(text, w, syn_config=SynthesisConfig(length_scale=ls, noise_scale=.62, noise_w_scale=.8))
    sr = V[v].config.sample_rate
    f = 2 ** (st / 12)
    af = f'asetrate={int(sr * f)},aresample={sr},atempo={1 / f:.4f}' if st else 'anull'
    af += extra + ',silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.15,loudnorm=I=-16:TP=-1.5'
    mp3 = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-af', af, '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', '64k', mp3], check=True)
    d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3], capture_output=True, text=True).stdout)
    return 'audio/vo_hg/' + name + '.mp3', round(d, 2)
out = {'lines': {}, 'barks': {}}
for sp, text in LINES:
    f, d = render(text, sp, 'h_' + hashlib.md5(text.encode()).hexdigest()[:8])
    out['lines'][text] = {'f': f, 'd': d, 'who': sp}
    print(f'{d:5.2f}s {sp:14s} {text}')
open(os.path.join(GAME, 'hg', 'vo_hg.js'), 'w', encoding='utf-8').write(
    "'use strict';\n// Generated by tools/make_vo_hg.py — HELL GATE Mission 1 voice lines (Piper TTS).\n// key = the subtitle text; f = file; d = seconds.\nconst VO_DATA = " + json.dumps(out, indent=1) + ";\n")
print('done', len(out['lines']))
