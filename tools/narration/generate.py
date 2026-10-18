# Generates narration MP3s with Kokoro (af_heart), normalised to -16 LUFS, 40 kbit/s mono.
#   audio/<id>/x<scene>_<line>.mp3, audio/<id>/xq<scene>.mp3   explainer lines and concept-check questions
#   audio/<id>/<n>.mp3                                           Theory paragraphs (Listen button), page order
# Existing files are kept (delete a file to regenerate it). Writes audio/manifest.json with clip durations.
import json, os, subprocess, sys, soundfile as sf
from kokoro_onnx import Kokoro
sys.path.insert(0, os.path.dirname(__file__))
from norm import norm
OUT = sys.argv[1] if len(sys.argv) > 1 else 'audio'
ONLY = sys.argv[2] if len(sys.argv) > 2 else 'all'   # all | expl | theory
T = json.load(open(os.path.join(os.path.dirname(__file__), 'narration.json')))
k = Kokoro(os.environ.get('KOKORO_MODEL', 'kokoro-v1.0.int8.onnx'), os.environ.get('KOKORO_VOICES', 'voices-v1.0.bin'))
mf = os.path.join(OUT, 'manifest.json')
man = json.load(open(mf)) if os.path.exists(mf) else {}
def clip(path, text):
    if os.path.exists(path):
        return sf.info(path).duration if path.endswith('.wav') else None
    a, sr = k.create(norm(text), voice='af_heart', speed=1.0, lang='en-us')
    tmp = path + '.wav'; sf.write(tmp, a, sr)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ac', '1', '-ar', '24000', '-b:a', '40k', path], check=True)
    os.remove(tmp); return round(len(a) / sr, 1)
def save(): json.dump(man, open(mf, 'w'))
for pid, v in T.items():
    os.makedirs(f'{OUT}/{pid}', exist_ok=True); m = man.setdefault(pid, {})
    if ONLY in ('all', 'expl'):
        xd = m.setdefault('x', {})
        for si, lines in enumerate(v['expl']):
            for li, t in enumerate(lines):
                d = clip(f'{OUT}/{pid}/x{si}_{li}.mp3', t)
                if d: xd[f'{si}_{li}'] = d
            if v['q'][si]:
                d = clip(f'{OUT}/{pid}/xq{si}.mp3', v['q'][si])
                if d: xd[f'q{si}'] = d
        save(); print(pid, 'expl done', flush=True)
for pid, v in T.items():
    m = man.setdefault(pid, {})
    if ONLY in ('all', 'theory'):
        m['n'] = len(v['theory']); td = m.setdefault('t', {})
        for i, t in enumerate(v['theory']):
            d = clip(f'{OUT}/{pid}/{i}.mp3', (v['name'] + '. ' if i == 0 else '') + t)
            if d: td[str(i)] = d
        save(); print(pid, 'theory done', flush=True)
print('DONE', flush=True)
