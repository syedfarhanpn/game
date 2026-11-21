# Generate Malayalam voice lines for Kochi: City of Shadows with Piper TTS (offline).
# key = the Manglish text the game shows (or a short id), ml = Malayalam script that is spoken.
import wave, os, sys, json, subprocess, hashlib
from piper import PiperVoice, SynthesisConfig

SCR = os.path.dirname(os.path.abspath(__file__))
GAME = sys.argv[1]
OUT = os.path.join(GAME, 'audio', 'vo'); os.makedirs(OUT, exist_ok=True)
TMP = os.path.join(SCR, 'vo_tmp'); os.makedirs(TMP, exist_ok=True)
VOICES = {'m': PiperVoice.load(os.path.join(SCR, 'voices', 'ml_IN-arjun-medium.onnx')),
          'f': PiperVoice.load(os.path.join(SCR, 'voices', 'ml_IN-meera-medium.onnx'))}

# speaker presets: model, length (speed), pitch in semitones, extra filter
P = {
    'ARJUN':  ('m', .92, 0, ''),
    'NIKHIL': ('m', .86, 2.5, ''),
    'NIKHIL_PHONE': ('m', .86, 2.5, ',highpass=f=380,lowpass=f=3100,acompressor=threshold=0.2:ratio=4'),
    'ALEX':   ('m', 1.04, -2.6, ''),
    'POLICE': ('m', .9, -1.4, ''),
    'm1': ('m', .9, 0, ''), 'm2': ('m', .84, 3, ''), 'm3': ('m', .95, -2.2, ''),
    'f1': ('f', .92, 0, ''), 'f2': ('f', .86, 2, ''),
}

LINES = [  # (key, speaker, malayalam)
    ('Eda Arjun! Innu nammude first big customer varunnundu!', 'NIKHIL', 'എടാ അർജുൻ! ഇന്ന് നമ്മുടെ ഫസ്റ്റ് ബിഗ് കസ്റ്റമർ വരുന്നുണ്ട്!'),
    ('Achante workshop... innu muthal Varma Performance Works.', 'ARJUN', 'അച്ഛന്റെ വർക്ക്ഷോപ്പ്... ഇന്നു മുതൽ, വർമ്മ പെർഫോമൻസ് വർക്ക്സ്.'),
    ('Porsche aanu bro, Porsche! Shutter thurakku, vegam!', 'NIKHIL', 'പോർഷെ ആണ് ബ്രോ, പോർഷെ! ഷട്ടർ തുറക്ക്, വേഗം!'),
    ('Ithaanu... nammude customer.', 'ARJUN', 'ഇതാണ്... നമ്മുടെ കസ്റ്റമർ.'),
    ('pay', 'ALEX', 'നന്നായി, അർജുൻ. ഇതാ, നിന്റെ പൈസ.'),
    ('Pinne... nee boot-il onnum kandilla. Alle?', 'ALEX', 'പിന്നെ... നീ ബൂട്ടിൽ ഒന്നും കണ്ടില്ല. അല്ലേ?'),
    ('Onnum kandilla, sir.', 'ARJUN', 'ഒന്നും കണ്ടില്ല, സാർ.'),
    ("Eda... aa kaakka symbol... athu Victor D'Souza-yude aalukalude alle?", 'NIKHIL', 'എടാ... ആ കാക്ക സിംബൽ... അത് വിക്ടർ ഡിസൂസയുടെ ആളുകളുടെ അല്ലേ?'),
    ('Achante pazhaya file-ilum athe symbol undayirunnu...', 'ARJUN', 'അച്ഛന്റെ പഴയ ഫയലിലും, അതേ സിംബൽ ഉണ്ടായിരുന്നു...'),
    ('Adipoli! Ippo nammude garage pole thonnunnu.', 'NIKHIL', 'അടിപൊളി! ഇപ്പോ നമ്മുടെ ഗാരേജ് പോലെ തോന്നുന്നു.'),
    ('Varma Performance Works? Njan Alex Mathew.', 'ALEX', 'വർമ്മ പെർഫോമൻസ് വർക്ക്സ്? ഞാൻ അലക്സ് മാത്യു.'),
    ('Engine missing aanu, brake-um sheriyalla. Vaikunneram vare time undu.', 'ALEX', 'എഞ്ചിൻ മിസ്സിങ് ആണ്, ബ്രേക്കും ശരിയല്ല. വൈകുന്നേരം വരെ ടൈം ഉണ്ട്.'),
    ('Pinne... boot thurakkanda. Personal items aanu.', 'ALEX', 'പിന്നെ... ബൂട്ട് തുറക്കണ്ട. പേഴ്സണൽ ഐറ്റംസ് ആണ്.'),
    ('Sheri sir. Njan onnu nokkatte.', 'ARJUN', 'ശരി സാർ. ഞാൻ ഒന്ന് നോക്കട്ടെ.'),
    ('Kollaam. Oru test drive cheythu nokku — neighbourhood-il oru round.', 'ALEX', 'കൊള്ളാം. ഒരു ടെസ്റ്റ് ഡ്രൈവ് ചെയ്തു നോക്ക്, നെയ്ബർഹുഡിൽ ഒരു റൗണ്ട്.'),
    ('Eda, aa car-nte boot-il entha? Customer valare tension-il aanu.', 'NIKHIL_PHONE', 'എടാ, ആ കാറിന്റെ ബൂട്ടിൽ എന്താ? കസ്റ്റമർ വളരെ ടെൻഷനിൽ ആണ്.'),
    ('Ariyilla. Ariyaanum thalparyamilla.', 'ARJUN', 'അറിയില്ല. അറിയാനും താൽപര്യമില്ല.'),
    # police
    ('Vandi side-aakku!', 'POLICE', 'വണ്ടി സൈഡാക്ക്!'),
    ('License-um RC-yum kaanikku.', 'POLICE', 'ലൈസൻസും ആർസിയും കാണിക്ക്.'),
    ('Nilkku! Police!', 'POLICE', 'നിൽക്ക്! പോലീസ്!'),
    ('Kai pokku!', 'POLICE', 'കൈ പൊക്ക്!'),
]
BARKS = [  # street talk: every line in 3 male + 2 female voices
    ('Police varunnundu!', 'പോലീസ് വരുന്നുണ്ട്!'),
    ('Odikko!', 'ഓടിക്കോ!'),
    ("Let's get out of here!", 'ലെറ്റ്സ് ഗെറ്റ് ഔട്ട് ഓഫ് ഹിയർ!'),
    ('Ayyo!', 'അയ്യോ!'),
    ('Nee aara?!', 'നീ ആരാ?!'),
    ('Vaa, kaanikkam!', 'വാ, കാണിക്കാം!'),
    ('Back off!', 'ബാക്ക് ഓഫ്!'),
    ('Chetta, car onnu side-il idamo?', 'ചേട്ടാ, കാർ ഒന്ന് സൈഡിൽ ഇടാമോ?'),
    ('Bro, nice car!', 'ബ്രോ, നൈസ് കാർ!'),
    ('Adipoli vandi!', 'അടിപൊളി വണ്ടി!'),
    ('Pathukke po, chetta!', 'പതുക്കെ പോ, ചേട്ടാ!'),
    ('Eda, evideya pokunne?', 'എടാ, എവിടെയാ പോകുന്നേ?'),
    ('Chetta, entha vishesham?', 'ചേട്ടാ, എന്താ വിശേഷം?'),
    ('Namaskaram!', 'നമസ്കാരം!'),
    ('Hello bro!', 'ഹലോ ബ്രോ!'),
    ('Chaaya kudicho?', 'ചായ കുടിച്ചോ?'),
]

def render(ml, preset, name):
    model, ls, st, extra = P[preset]
    wav = os.path.join(TMP, name + '.wav')
    with wave.open(wav, 'wb') as w:
        VOICES[model].synthesize_wav(ml, w, syn_config=SynthesisConfig(length_scale=ls, noise_scale=.6, noise_w_scale=.75))
    f = 2 ** (st / 12)
    af = f'asetrate={int(22050 * f)},aresample=22050,atempo={1 / f:.4f}' if st else 'anull'
    af += extra + ',silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.12,loudnorm=I=-16:TP=-1.5'
    mp3 = os.path.join(OUT, name + '.mp3')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', wav, '-af', af, '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', '56k', mp3], check=True)
    d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3], capture_output=True, text=True).stdout)
    return 'audio/vo/' + name + '.mp3', round(d, 2)

h = lambda s: hashlib.md5(s.encode('utf-8')).hexdigest()[:8]
out = {'lines': {}, 'barks': {}}
for key, sp, ml in LINES:
    f, d = render(ml, sp, 'l_' + h(key)); out['lines'][key] = {'f': f, 'd': d}
    print(f'{d:5.2f}s  {sp:13s} {key}')
for key, ml in BARKS:
    b = {'m': [], 'f': [], 'd': 0}
    for pv in ['m1', 'm2', 'm3', 'f1', 'f2']:
        f, d = render(ml, pv, f'b_{h(key)}_{pv}'); b[pv[0]].append(f); b['d'] = max(b['d'], d)
    out['barks'][key] = b
    print(f'{b["d"]:5.2f}s  bark          {key}')
js = ("'use strict';\n// Generated by make_vo.py — Malayalam voice lines (Piper TTS, voices ml_IN arjun / meera).\n"
      "// key = the Manglish text shown on screen; f = file, d = duration in seconds.\n"
      "const VO_DATA = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n")
open(os.path.join(GAME, 'js', 'voicelines.js'), 'w', encoding='utf-8').write(js)
print('files:', len(os.listdir(OUT)))
