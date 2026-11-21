# HELL GATE — prototype: Missions 1–6 + New York map

A separate game in this folder, built from the **HELL GATE Story Bible**. The Kochi game (`index.html`) still works on its own.

**Run it:** `python serve.py`, then open **http://localhost:8737/hellgate.html**.
- The title screen has a mission select for Missions 1–6.
- You can also open a mission directly with `hellgate.html?m=2` … `?m=6`.
- When a mission ends, the end screen offers the next one.

Status key:
- **[OK]** played through start to finish in this build, by scripted runs (see "How this was tested").
- **[PARTIAL]** works, but with limits.
- **[TODO]** not built.

## The missions

| # | Title | Where (real map) | Time / weather | What you do |
|---|---|---|---|---|
| 1 | Delphine | Red Hook Houses, Brooklyn | Storm, five years ago | Rescue dive in the flooded Building 7 |
| 2 | Stash House | Hunts Point waterfront, the Bronx | Night, rain | Swim in through a drainage pipe, stealth, get Lucía out |
| 3 | Bridge Traffic | Lincoln Tunnel approach, Midtown | Night, rain | Static cuts the lights; take Harold off a prison bus |
| 4 | The Watchmaker | Brighton Beach boardwalk | Night, clear | Waiter disguise, lift a key during the toast, crack a safe |
| 5 | Glass House | West Side rail yards, Midtown | Night, 300 m up | Up a gondola to a rooftop gala; take Iris Achebe |
| 6 | Burn Notice | Gowanus Canal, Brooklyn | Dawn | Raid, rooftop run, burning tugboat, flooded subway swim |

### Mission 1 — Delphine [OK]
The same as before, re-checked on the new engine.

You dive into the flooded Building 7 with Rafael, find Nia and carry her out, then lose Rafael. It has five checkpoints and the full voiced script. See the end of this file for the detailed list.

### Mission 2 — Stash House [OK]
1. **Intro cutscene at the Low Note, Deacon's Harlem jazz bar.** Deacon gives the job: get Lucía Ortega, 19, out of a Hunts Point warehouse.
2. **The river.** Swim up the East River at night in the rain to the warehouse's drainage outflow.
3. **The pipe.** Dive into it, pry a rusted grate loose underwater, and surface in the sump inside.
4. **The warehouse.** Six armed men:
   - two on patrol routes;
   - two at a card table;
   - one on the office mezzanine;
   - one at the gate.

   The interior is dark between pools of sodium light. Crouching in the shadows keeps you hidden, and you can take a guard down from behind.
5. **Lucía.** Pick the office lock and cut her loose. She can't make the swim back, so Eli calls Deacon for plan B.
6. **The escape.** The men find out and open fire. Get her through the warehouse to the yard.
7. **Sof.** The getaway van is thrown sideways through the gate. "You Eli? Get in the van!"

   The ending is a voiced drive-away scene: Sof, Lucía and Eli.
- Checkpoints: in the river, inside the warehouse, and after Lucía is freed.
- You fail if Eli is shot or drowns.

### Mission 3 — Bridge Traffic [OK]
1. **Intro.** An aerial shot of Midtown in the rain, then Eli walks down the tunnel ramp between jammed, honking cars.
2. **Static is introduced.** Static speaks in Eli's earpiece: "I'm in your ear, and in every camera in this tunnel."
3. **Lights out.** Static cuts the tunnel lights on request. Red emergency lamps come on, and the corrections officers switch on flashlights.
   - **Q is Static's ping:** it marks every guard through walls for 8 seconds, with a 12-second cooldown.
4. **The bus.** Sneak between the cars to the prison bus. Static unlocks the rear door, and Harold the accountant (orange jumpsuit, cuffed) gets off. He follows you.
5. **The escape.** The officers raise the alarm and start shooting in the dark. Get Harold to the emergency cross-passage, up the stair to Dyer Avenue, and into Sof's van. The ending is a voiced van scene.

### Mission 4 — The Watchmaker [OK]
1. **The boardwalk.** Galina Petrova sits on a bench at night: her grandfather's Fabergé watch, Viktor Sorokin, and the deal.
2. **The Odessa Palace, during Viktor's daughter's wedding.** Eli works as a waiter.
   - Pick up trays at the pass and serve three tables.
   - Guards ignore waiters downstairs. The service stair and the upper floor are off limits, and you're a trespasser there.
   - The room has guests seated at tables, couples dancing, waiters walking their routes, the head table and chandeliers.
3. **The toast.** Viktor gives a voiced speech and the room shouts "Gorko!". Hold E behind him to lift the key, but only while the room is loud. Three slips and Viktor catches your hand.
4. **Upstairs.** Two of Viktor's men patrol the balcony and the corridor; you can take them down. In the office, Galina talks you through the safe on the phone.
   - **The safe dial:** turn it with the mouse or A/D, and press E on a number.
   - The first two numbers are 18 and 96, the year of the watch. The third you find by listening for the heavier click.
5. **The escape.** "My key! Find the waiter!" Armed guests appear. Get out through the kitchen to the alley.
6. **The ending.** Galina gets the watch on the boardwalk: "We have a beginning."

### Mission 5 — Glass House [OK]
1. **The gondola.** Eli rides a window-washer gondola up the glass face of the fictional Crane Meridian tower, with Static briefing him in his ear.
2. **The roof deck at 300 m.** It has:
   - a glass gala pavilion;
   - string lights and a glass railing;
   - the rooftop plant to hide behind;
   - five Halcyon operators in black.
   - Static has patched you into Halcyon's radio, so you hear Kessler giving orders.
3. **Crane's speech.** It starts when you come close and pulls every eye to the stage: "Five years ago this city drowned. Two hundred and twelve people…"
4. **Iris Achebe** waits alone by the glass. She comes far too easily: "Took you long enough."
5. **Back to the gondola** while Halcyon starts searching for her.
6. **The descent, then the van.** "I'm the client."

### Mission 6 — Burn Notice [OK]
1. **Dawn in the crew's Gowanus loft.** Static warns of three black SUVs, then a flashbang hits.
2. **Up the steel stair to the roof**, under fire from the breach team.
3. **The rooftop run** across four buildings of different heights:
   - a plank across the first gap;
   - a stack of crates up to a higher roof;
   - a running jump down to the last roof (Shift + Space);
   - Halcyon shooting from the street and from the roof behind you;
   - parapets give cover.
4. **The tugboat.** Eli's tugboat is moored on the real Gowanus Canal. Halcyon blows it up, and it burns with fire and smoke for the rest of the mission.
5. **The street.** Down the fire escape, then kick in a boarded-up subway entrance.
6. **The flooded station** (a fictional abandoned IND stop, flooded since Delphine).
   - The tunnel is flooded to the ceiling, and the flashlight flickers and dies.
   - Swim in the dark from one air pocket to the next under old vent shafts. Iris follows with her own breath meter.
7. **Out at dawn.** The end card reads "To be continued — Mission 7: Low Tide".
- You fail if Eli is shot, falls from a roof, or drowns, or if Iris drowns.

## What the new missions share (engine)
- **Real neighbourhoods from OpenStreetMap** (© OpenStreetMap contributors, ODbL), each with its own origin. All of them have real street networks, building footprints and heights, and the coastline and canals.
  - Hunts Point: 964 buildings.
  - Brighton Beach: 2,874 buildings, the sand beach and the wooden Riegelmann Boardwalk.
  - Gowanus: 5,814 buildings and the canal.
  - Midtown: 5,272 buildings, 533 of them towers, the tallest 472 m.
  - The Lower Manhattan skyline is visible from Gowanus and Midtown, and the Statue of Liberty from Gowanus.
  - Mission sites remove the real buildings they replace.
- **Weather and time of day:** storm (M1), rain (M2, M3), clear night (M4), clear high-altitude night with stars (M5) and dawn with a low sun (M6).
  - Each sets its own sky colours, fog, ambient light and amount of rain.
  - Street lights work, except in M1's blackout, and lit windows vary by mission.
- **River and sea water** only shows over real water, and concrete seawalls run along the shores, except on beaches.
  - Sets can hold their own water: the sump, the drainage pipe and the flooded subway.
  - Underground is dark: no sky light, and black fog.
- **Sets:** interiors built from boxes, with walls, doors, stairs, ramps and props, and with collision that works for walking and swimming. Built so far:
  - the warehouse, the bar, the tunnel and ramp, and the emergency stair;
  - the banquet hall, the tower roof, the rooftop row, the loft and the subway.
- **Eli:**
  - walks, runs, jumps and crouches (C on land);
  - can be hurt: a red screen edge, and health comes back after 5 seconds out of fire;
  - takes fall damage;
  - dives automatically into fully flooded passages;
  - swims up submerged stairs;
  - can climb out onto any seawall or ledge.
- **Guards:**
  - have a sight cone; they see less when you crouch, stand in the dark or are in the water;
  - hear running and splashing;
  - grow suspicious, which shows as a ? / ! over the guard or an arc pointing toward him;
  - search the last place they saw you, then return to their patrol;
  - raise the alarm with guards nearby;
  - shoot, with tracers, muzzle flashes and sound;
  - notice bodies;
  - can be taken down from behind (E).
- **Followers** (Lucía, Harold, Iris) walk Eli's own path, so they follow through pipes, stairs and flooded tunnels.
  - Iris has her own breath meter and swims up to Eli's air pocket.
- **Extras:** seated guests, dancers, people talking, drinking or carrying trays, bartenders. Far-away and seated people animate less often to save time.
- **Voiced dialogue:** Missions 2–6 have 144 lines from 19 voice presets, generated offline with Piper TTS.
  - The earpiece, phone and radio presets use filters, and crane uses a PA echo.
  - The "Gorko!" chant layers six voices.
  - Subtitles and audio come from the same text in the mission scripts.
- **Sound effects only, no music** (as asked earlier): rain, wind, crowd noise, applause, glass clinks, gunfire, a flashbang, fire, engines, tyre screeches, the safe dial, car horns and the tunnel hum.

## Controls
- **WASD** walk / swim
- **Mouse** look
- **Shift** run / swim harder
- **Space** jump / surface
- **C** crouch on land, dive in water
- **E** interact, hold for actions, take down a guard from behind
- **Q** Static's ping (Missions 3, 5, 6)
- **F** flashlight
- **M** map
- **Esc** pause
- **Hold Space** to skip a cutscene

## How this was tested (and what wasn't)
- Each mission was driven in the in-app browser with scripted input:
  - simulated keys;
  - teleports to each objective;
  - every step, checkpoint and cutscene run through to the end screen.
  - I checked collision, mode changes and objectives along the way, plus screenshots of the key scenes.
- **Nobody has played them by hand yet.** The difficulty is a first guess: guard ranges, accuracy, breath and jump distances. Expect to tune them.
- Performance was measured only in the hidden in-app pane. The frame cost is about 5–11 ms at 640×360, and M4 (with 27 extras) is the heaviest. Not measured in a normal desktop browser window or on phones.

## Known limitations
- **Guards have no pathfinding.** They walk straight lines or set routes and can snag on furniture. They don't use cover, and in M6 they stay on the floor they start on.
- **Eli never carries a gun.** You can avoid guards, take them down from behind, or run.
- **People use the same three stock models**, recoloured, and there's no lip sync.
  - Every woman (Sof, Galina, Iris, Lucía) shares one model; Galina gets a coat and headscarf.
  - The swimming and arm poses are generated by code.
- **Vehicles only move in cutscenes.** The jammed cars are simple shapes.
- **Interiors exist only where a mission needs them.** The city buildings are exterior shells.
  - Shorelines follow a 3 m ground grid, so they're a little blocky up close.
- **Fiction on real maps:**
  - The Crane Meridian tower is placed on the real West Side rail yards.
  - The tunnel interior, its emergency stair, the Odessa Palace and the flooded station are invented.
- **Voices are synthetic.** The ryan voice (Eli) is **non-commercial (CC BY-NC-SA)**: replace or license it before any release.
- The story bible's Missions 7–22, the Deacon's-bar hub, choices and endings are not built.

## Files
- **Game:** `hellgate.html`, `css/hellgate.css`, and in `hg/`:
  - `hg_world.js`: areas, weather, water, sites.
  - `sets.js`: interior builder, vehicles, cutscene cameras.
  - `diver.js`: Eli and the camera.
  - `actors.js`: the cast, guards, followers, extras and effects.
  - `mission_base.js`, `mission1.js`, `m2_stash.js`, `m3_traffic.js`, `m4_watch.js`, `m5_glass.js`, `m6_burn.js`.
  - `nycmap.js`, `hg_main.js`.
  - `vo_hg.js` and `vo_m2_6.js`: voice data.
- **Shared with the Kochi game:**
  - `js/realhuman.js`: gained HELL GATE poses (rifle, aim, tray, cuffs, phone, dance, clap, talk). Police uniforms can now be tinted.
  - `js/config.js`, `js/audio.js`, `js/voice.js`, `js/humanoid.js`, `js/cinematic.js`.
- **Data:**
  - `models/map/nyc/` contains, for each area, `<area>.json`, `<area>_ground.png`, `<area>_far.png` and `<area>_sky.json`, plus Red Hook and the NYC map.
  - `audio/vo_hg/` holds the voice clips: Mission 1 and `m2_…` to `m6_…`.
- **Tools:** `tools/build_areas.py` (new areas), `tools/build_nyc.py` (Red Hook, skyline, NYC map), `tools/nyc_osm.py` (shared helpers), `tools/make_vo_hg.py` (M1 voices), `tools/make_vo_m2_6.py` (M2–M6 voices). See `tools/README.txt`.
- Map data © OpenStreetMap contributors (ODbL). All characters, companies, the storm and the barrier are fictional; New York places are used as settings.

---

## Mission 1 in detail (unchanged)
1. Intro cutscene "Storm Delphine", wide shot over flooded Red Hook and the real Manhattan skyline, the captain's warning, "Nobody's a hero tonight."
2. Follow Rafael: dive under the flooded lobby door, swim to the west stairwell, climb out on the second floor.
3. Search the west apartments; the east side is cut off; the captain orders everyone out; a child calls for help — "Then write me up."
4. Drop through a hole in a floor, swim under the collapse, climb the east stairs, force a jammed door.
5. Nia: "You ever hold your breath in a pool?" — piggyback carry with her own breath meter.
6. Out through the flooded lobby; hand Nia to the boat; Rafael on the radio: "I'm pinned."
7. Find Rafael behind the debris; the captain pulls Eli out; "one of the 212"; FIVE YEARS LATER; HELL GATE.
- Diving: walk, wade, swim, dive in 3D; 75-second breath with gasps and heartbeat; climbing out onto ledges; helmet flashlight; camera that keeps clear of walls and the waterline.
