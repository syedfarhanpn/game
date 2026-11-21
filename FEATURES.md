# Kochi: City of Shadows — feature list (prototype v0.2: real map, real voices)
> A second game, **HELL GATE** (New York, Missions 1–6: Delphine, Stash House, Bridge Traffic, The Watchmaker, Glass House, Burn Notice), lives in the same folder: open `hellgate.html`. See HELLGATE.md.

Browser game, Three.js r128. Run it with `python serve.py` and open http://localhost:8737.
Status key: **[OK]** tested in this build · **[PARTIAL]** works but limited · **[TODO]** not built yet.

## Story and mission
- [OK] Opening cinematic on the real map: sunrise over the Arabian Sea off Fort Kochi Beach, the Chinese fishing nets on the real north shore, a dolly down Rose Street, then Nikhil rides up Veli Road to Varma Performance Works.
- [OK] Mission 1, "THE NEW CUSTOMER", runs end to end:
  1. Open the shutter.
  2. Customer cutscene: Alex Mathew arrives in a black Porsche 911.
  3. Talk to Alex.
  4. Inspect the car (job card, where the boot reveals the Crow case).
  5. Repair it at the service bay.
  6. Test drive through 3 checkpoints on real roads near Veli and the beach road, with a phone call from Nikhil.
  7. Bring the car back to the garage.
  8. Ending cutscene, then payout and reputation.
- [OK] The customer's faults are real. The bad ignition coil costs about 28% power and the worn pads about 38% braking, until each repair job finishes.
- [OK] Payout is ₹45,000 minus damage to the customer's car (minimum ₹15,000). Reputation +10.
- [OK] Dialogue subtitles are in Manglish (Malayalam in Latin script) with an English translation. The pause menu switches between Malayalam + English, Malayalam only, and English only.

## Spoken dialogue and audio
- [OK] **People speak.** Every story line (21) and every street line (16) has real Malayalam speech, generated offline with Piper TTS and its two Malayalam voices (ml_IN "arjun", male, and "meera", female). That's 101 clips, 1.5 MB, in `audio/vo/`.
  - Each character gets a distinct pitch and pace: Arjun, Nikhil, Alex Mathew and the police. Nikhil's phone call goes through a phone filter.
  - Pedestrians use 3 male and 2 female voice variants. Their lines play from where they stand: louder when close, panned left or right.
  - The subtitle waits for the spoken line to finish, and cutscene timings were adjusted so no line gets cut off.
  - Background sound effects dip while someone talks.
- [OK] English dialogue mode speaks the English line with the browser's own voice, preferring Indian English (Microsoft Ravi / Heera on this PC).
- [OK] Police speech: loudspeaker "Vandi side-aakku!" (pull over) during chases, "Nilkku! Police!" when officers get out, "License-um RC-yum kaanikku" at traffic stops, "Kai pokku!" on arrest.
- [OK] **No music** (by request). The music sequencer, radio stations and musical jingles were removed. Q no longer does anything.
- [OK] Sound effects stay: engine, tyres, horn, siren, impacts, doors, city noise, and sea and backwater waves (now driven by the real coastline around you).
- [PARTIAL] The voices are synthetic text-to-speech. They're clear Malayalam but not as natural as recorded actors. The voice training data (IIT Madras Indic TTS) should be license-checked before any commercial release.
- [TODO] Missions 2 onward, the Crow investigation, choices and consequences.

## Player: Arjun Varma
- [OK] Third-person camera, walk, sprint, jump, crouch (C, with a crouch-walk), punch (left click), kick (R / right click).
- [OK] Short dark hair and Kerala skin tones replace the stock model's hat and pale skin.
- [PARTIAL] The body is the stock Ready Player Me model, so Arjun still wears its suit and bow tie. A proper mechanic outfit needs a new model.
- [OK] Character panel (Tab): bio, money, reputation, health, wanted level, injuries, owned vehicles, current job.
- [TODO] Clothing and appearance customisation, inventory items, swimming.

## Varma Performance Works (garage)
- [OK] Animated shutter, a service bay and on-screen prompts. Press E in the bay, on foot or in a vehicle.
- [OK] Upgrade levels change the real physics: engine, turbo, exhaust, transmission, suspension, brakes, tyres and aero kit.
  - The stats panel (top speed, 0–100, grip, braking distance, durability) comes from a physics simulation, not fixed numbers.
  - Tested: exhaust plus brakes on the Royal Enfield took 0–100 from 13.0 s to 12.4 s and braking from 39.4 m to 35.8 m.
- [OK] Paint (12 colours), repair (cost scales with damage), storing and taking out owned vehicles.
- [OK] Customer job mode with timed repair tasks.
- [OK] Garage income each in-game morning once Mission 1 is done (₹3,000 + reputation × 200).
- [PARTIAL] The aero kit and wheels change the physics only. No visible body-kit or rim meshes yet.
- [TODO] Buying new cars, more customers, staff.

## Vehicles
- [OK] Real models: Ferrari 458 and Porsche 911 Carrera 4S (cars), plus Royal Enfield Classic 350, Kawasaki Ninja H2, Yamaha R1, Ducati Panigale V4 R, Suzuki Hayabusa and Kawasaki Z1000 (bikes).
- [OK] Physics:
  - Dynamic tyre model with load transfer and stability control.
  - Real 0–100 and top-speed figures.
  - Mass-based collisions and damage.
  - Bike lean and riding posture.
- [OK] Enter and exit with F, including pulling drivers out of their cars.
- [OK] Speedometer with gear, rev bar and damage bar.
- [PARTIAL] The database lists 359 real vehicles, but only the 8 above have 3D models. Traffic uses only those 8.
- [TODO] Autorickshaws, KSRTC buses and Indian hatchbacks. They need free, licensed 3D models.

## Kochi world
- [OK] **The real map of Fort Kochi and Mattancherry**, about 3.1 × 2.4 km, built from OpenStreetMap data (© OpenStreetMap contributors, ODbL):
  - The real road network: 2,075 road segments with real street names, real widths by road class, and one-way rules.
  - 7,859 real building footprints, with Kerala clay-tile hip roofs on small houses and flat concrete roofs elsewhere. Every building has collision.
  - The real coastline: the Arabian Sea, Fort Kochi Beach, the harbour mouth, the backwaters, canals and ponds, plus Willingdon Island across the water.
  - Real parks and grounds, such as Veli Ground and the Parade Ground.
  - Real landmarks: Taluk HQ Hospital Fort Kochi, Govt. Hospital Mattancherry, an Urban PHC, Sangeetha Nursing Home, Fort Kochi Police Station, St Francis Church, Santa Cruz Basilica, the Paradesi Synagogue, the bus stand and the water metro stations.
  - Up to 170 real shop, café and homestay names from the map on painted signboards (Malayalam where the map has it), plus generic Malayalam boards.
- [OK] Varma Performance Works sits on the real Veli Road (south Fort Kochi), with a concrete forecourt, office and parking bays.
- [OK] Kerala street feel:
  - Whitewashed compound walls (with gates) along local lanes.
  - About 8,500 coconut palms around houses and along the shore.
  - Chinese fishing nets on the real north shore, tea stalls at the garage, the beach, the bus stand and landmarks.
  - Street lamps along every main road, and speed cameras on the longest main roads.
- [OK] Traffic AI drives the real road graph:
  - Keeps left on two-way roads and respects one-way streets.
  - Picks turns at real junctions and slows for bends, people and parked cars.
  - Pulls out to overtake parked cars.
  - Tested over 40 s: 29 of 30 cars on the carriageway, and almost every moving car in the left lane.
- [OK] Pedestrians walk along real street sides and footpaths and carry on into connecting streets at junctions.
- [OK] Posted speed limits by road class: 60 km/h on trunk and primary roads, 50 on secondary and tertiary, 30 in lanes.
- [OK] Streets fill with traffic, parked cars and pedestrians as soon as play starts.
- [OK] Day and night cycle with street lights.
- [PARTIAL] Buildings are extruded footprints with a generic window texture, not detailed heritage facades. OSM coverage is incomplete in places, so some lanes have open yards where real buildings stand.
- [PARTIAL] The rest of Kerala isn't drivable: a browser game can't hold 39,000 km². Kerala appears as the state map on M.
- [TODO] Ferries and water metro rides, rain and monsoon weather, Ernakulam mainland.

## People, police and law
- [OK] Pedestrians walk, flee, fight and get knocked down. Their speech bubbles mix Malayalam and English, for example:
  - "Eda, evideya pokunne?"
  - "Bro, nice car!"
  - "Police varunnundu!"
- [OK] Kerala Police in khaki on foot, with no shooting. BNS / MV Act offences, e-challans, speed cameras, traffic stops, arrest procedure.
- [OK] Wanted system.
- [OK] 108 ambulance and real hospitals by tier: Taluk HQ Hospital, Govt. Hospital Mattancherry, Urban PHC and Sangeetha Nursing Home (private). Injuries are treated by the right department. Department lists are a game simplification.

## Interface and saving
- [OK] HUD:
  - ₹ money in Indian digit grouping, and reputation.
  - Minimap of the real streets.
  - M opens the Fort Kochi city map; pressing M again opens the **Kerala state map** (14 real districts with Malayalam names, major towns, and a "you are here" marker at Fort Kochi).
  - Mission objective, interaction prompt.
  - Hospital GPS on G (hold G to call 108).
- [OK] Pause menu (Esc): resume, dialogue language, restart job. Esc closes the garage and documents without opening the pause menu.
- [OK] Save to the browser's localStorage (`kochi_save`): mission, money, reputation, owned vehicles with upgrades and paint, time of day. Tested with save then continue.

## Controls
| Key | Action |
|---|---|
| WASD | move / drive |
| Mouse | camera |
| Shift | sprint |
| Space | jump / handbrake |
| E | interact |
| F | enter / exit vehicle |
| Left click / R | punch / kick |
| C | crouch |
| Tab | character panel |
| M | city map → Kerala map → close |
| G | hospital GPS (hold: call 108) |
| H | horn |
| V | cinematic camera |
| Esc | pause |

## Known limitations (honest list)
- Only 8 vehicles have real 3D models. No autorickshaws or buses yet.
- Only 3 human models: the male model, Michelle, and the police Soldier. Everyone shares them with recoloured clothes.
- The aero kit and wheels have no visible parts.
- Performance: after optimisation, about 620 draw calls and 0.9 M triangles per frame, and roughly 18 ms per frame in the in-app browser pane. Game logic is about 3–4 ms; the rest is GPU. Pedestrian models are the heaviest item. Not measured on a normal desktop browser window.
- About 147 MB of local files (models, the 0.9 MB map data, 1.5 MB voices), so the game must be served from this folder (it can't be a single-file web page).
- Map and voice tools (not needed to play) are in `tools/`: `build_map.py` with the raw OpenStreetMap download, and `make_vo.py`. See `tools/README.txt`.
- Not tested on mobile or touch screens.
