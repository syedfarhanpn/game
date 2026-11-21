Tools used to build game data (not needed to play).

build_map.py  - converts the OpenStreetMap extracts in tools/osm/ into models/map/*.
                Run:  python build_map.py "<game folder>"   (needs numpy; reads ./osm/kochi.json and ./osm/kerala.json)
                Data (c) OpenStreetMap contributors, ODbL. Queries used: osm/kochi.ql, osm/kerala.ql (overpass-api.de).
make_vo.py    - generates the Malayalam voice clips in audio/vo/ and js/voicelines.js with Piper TTS.
                Needs: pip install piper-tts==1.8.0, ffmpeg on PATH, and the voices ml_IN-arjun-medium / ml_IN-meera-medium
                (huggingface.co/rhasspy/piper-voices, ~63 MB each) in ./voices/.  Run:  python make_vo.py "<game folder>"

HELL GATE (New York):
build_nyc.py  - converts tools/osm_nyc/*.json (Overpass: Red Hook, Lower Manhattan skyline, NYC coastline + boroughs)
                into models/map/nyc/*.   Run:  python build_nyc.py "<game folder>"   (needs numpy)
make_vo_hg.py - Mission 1 voice lines with Piper TTS (en_US ryan-high, norman, kristin, joe medium voices in a folder).
                Run:  python make_vo_hg.py "<game folder>" "<voices folder>"   (needs piper-tts, ffmpeg)
build_areas.py - the Mission 2-6 neighbourhoods (Hunts Point, Brighton Beach, Gowanus, Midtown) from tools/osm_nyc/<area>.json
                 into models/map/nyc/<area>.json, <area>_ground.png, <area>_far.png (+ <area>_sky.json for Gowanus / Midtown).
                 Run:  python build_areas.py "<game folder>" [area ...]   (needs numpy; uses nyc_osm.py)
                 Queries: osm_nyc/huntspoint.ql, brighton.ql, gowanus.ql, midtown.ql (overpass-api.de). Data (c) OpenStreetMap contributors, ODbL.
nyc_osm.py     - shared OpenStreetMap helpers (ring simplification, coastline sea/land raster, polygon fill, PNG writer).
make_vo_m2_6.py - Mission 2-6 voice lines with Piper TTS. Reads the lines straight out of hg/m2_stash.js ... hg/m6_burn.js
                 (say / sayAsync / ln / guard barks), so subtitles and audio always match. Voices: en_US ryan-high, norman, kristin,
                 joe, bryce, amy (medium), danny (low), en_GB alba (medium).  Writes audio/vo_hg/m<N>_*.mp3 and hg/vo_m2_6.js.
                 Run:  python make_vo_m2_6.py "<game folder>" "<voices folder>"   (needs piper-tts, ffmpeg)

