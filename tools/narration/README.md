# Narration audio

The explainer and the Listen button play MP3 files from `audio/<experiment id>/`:

| File | Content |
|---|---|
| `x<scene>_<line>.mp3` | explainer line (scene and line numbers from 0, as in `assets/js/expl.js`) |
| `xq<scene>.mp3` | concept-check question of that scene |
| `<n>.mp3` | n-th paragraph or list item of the Theory text, in page order |
| `audio/manifest.json` | clip durations, used to pace captions when audio cannot play |

If a file is missing or the browser blocks audio, the lab shows captions and keeps going.

## Regenerating

Requirements: Node, Python 3, ffmpeg, `pip install kokoro-onnx soundfile`, and the model files `kokoro-v1.0.int8.onnx` and `voices-v1.0.bin` from the kokoro-onnx releases.

```sh
node tools/narration/extract.js            # writes tools/narration/narration.json from expl.js and the theory text
KOKORO_MODEL=/path/kokoro-v1.0.int8.onnx KOKORO_VOICES=/path/voices-v1.0.bin \
  python3 tools/narration/generate.py audio all     # or: expl | theory
```

Existing MP3s are kept; delete the ones whose text you changed. `norm.py` rewrites symbols and units into speakable words (σ → sigma, MPa → megapascals, 10⁻⁶ → ten to the minus six, and so on); add an entry to its `FIX` list if a formula is read badly. Output is loudness-normalised to −16 LUFS, mono, 40 kbit/s.
