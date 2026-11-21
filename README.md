# Browser games (Three.js)

Two open-world prototypes that run in the browser:

- **Kochi: City of Shadows** (`index.html`): a garage-mechanic story set on the real Fort Kochi map, with Malayalam voices. See [FEATURES.md](FEATURES.md).
- **HELL GATE** (`hellgate.html`): a New York crime story with six missions built on real OpenStreetMap neighbourhoods. See [HELLGATE.md](HELLGATE.md).

## Run

```bash
python serve.py
```

Then open http://localhost:8737 for Kochi, or http://localhost:8737/hellgate.html for HELL GATE. To jump straight to a HELL GATE mission, add `?m=1` … `?m=6` to the URL.

You can't open the pages straight from disk because browsers block local file loading, so use the server. It needs nothing beyond Python 3.

The scripts in `tools/` rebuild the map data and voice lines. You don't need them to play; see [tools/README.txt](tools/README.txt).

## Credits

- Map data © OpenStreetMap contributors, ODbL.
- Ferrari, Michelle, Soldier and the male character (readyplayer.me) models: from the [three.js examples](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf).
- Bike models: CC BY 4.0, credited in [models/bikes/CREDITS.txt](models/bikes/CREDITS.txt).
- Porsche 911 model: Karol Miklas, CC BY-SA 4.0, see [models/porsche_911_LICENSE.txt](models/porsche_911_LICENSE.txt).
- Voices: Piper TTS ([rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices)). The en_US "ryan" voice is CC BY-NC-SA, so the HELL GATE audio that uses it is for non-commercial use only.
- Built with [three.js](https://threejs.org) r128.
