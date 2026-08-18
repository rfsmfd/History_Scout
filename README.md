# History Scout — Phase 1

Document old homes, churches, schools, cemeteries, archaeological sites, and stores in the
field: one photo, automatic GPS + accuracy + date/time + compass heading, a category, and
you're moving on. Details get filled in later at the kitchen table.

Built the same way as Outdoor Companion — a single `index.html`, served from GitHub Pages,
installed to the iPhone home screen. **No Mac, no Xcode, no Apple Developer account, no $99/yr.**

---

## The two halves

**Capture (in the field)** — one big button. Photo, position, time, and heading are recorded
automatically. You tap one category tile. Under ten seconds, works with gloves on, works with
no cell signal.

**Curate (at home)** — open the site, fill in condition, dates, materials, access, threats,
research notes. Add more photos. Correct the position. Export.

Standing in a briar patch is the wrong moment to be typing "hand-hewn timber" into a form.

---

## What's in it

- Camera capture and photo-library import, several photos per site
- GPS latitude/longitude in decimal and DMS, accuracy in metres, elevation
- Compass heading with four fallbacks (see below), recorded per photo
- 7 built-in categories plus your own custom ones
- Removable info overlay — **stamped only on exported copies, never on your stored originals**
- Map of every documented site: aerial, USGS topo, or street
- Proximity grouping — walk back to a site you already recorded and it offers to add photos
  to the existing record instead of making a duplicate
- Export: `sites.csv`, `photos.csv`, `sites.geojson`, and a `photos/` folder, all in one ZIP
- Works fully offline once installed

---

## Installing it on your iPhone

1. Push this folder to a GitHub repo and turn on GitHub Pages (same as Outdoor Companion).
2. On the iPhone, open the Pages URL **in Safari** (not Chrome).
3. Share button → **Add to Home Screen**.
4. Open it from the home-screen icon, not from Safari.

Step 4 matters. Installed to the home screen, the app is exempt from Safari's 7-day storage
purge and gets a much larger storage allowance. Run from a Safari tab, your records are far
more fragile.

Grant **Location: While Using**, then tap **Enable Compass** once per launch — Apple requires
a deliberate tap before releasing compass data to a web page.

---

## The compass, honestly

This was the one genuinely uncertain part of building History Scout as a web app, so it tries
four sources and always tells you which one it used. The source is saved with every photo and
appears in the export, so you know how much to trust each reading.

| Source | Typical accuracy | Notes |
|---|---|---|
| iOS true compass | ±10–20° | Best case. Apple's magnetometer, corrected to true north. |
| Absolute orientation | ±10–20° | Cross-platform equivalent. |
| GPS course | very good | Only while walking. It's the way you're *moving*, not the way you're *pointing*. |
| Set by hand | as good as your judgement | Drag the needle. Never fails. |

Worth knowing: a phone magnetometer standing next to a tin roof, an iron fence, or your truck
is off by a good bit anyway. The manual dial is genuinely competitive in exactly the places
you'll be standing.

---

## Export, and why you should do it every trip

Records live in this phone's browser storage. Installed to the home screen that's durable
through normal use, but **iOS does not back it up to iCloud**, and Apple can evict data under
heavy storage pressure.

So: after every field session, **More → Export Everything**, and save the ZIP to Files or
iCloud Drive. It takes seconds and it's the difference between a bad afternoon and a lost one.

The ZIP contains:

| File | What it is |
|---|---|
| `sites.csv` | One row per site, every schema field as a column |
| `photos.csv` | One row per photo, with its own GPS and heading |
| `sites.geojson` | Point features — drag straight into ArcGIS, QGIS, or Google Earth |
| `photos/` | JPEGs, named `<site-slug>-NN.jpg`, matching the `file` column |

Full ArcGIS integration is deliberately left for later. This is the "get my data out" version,
and it's here from day one on purpose.

---

## Changing the field schema

The `FIELDS` array near the top of the `<script>` block in `index.html` is the **only** place
you edit. The detail form, the CSV columns, and the GeoJSON properties are all generated from
it.

```js
{k:'condition', l:'Condition', t:'sel', o:['','Intact','Ruins','Foundation only']}
```

- `k` — the column name in exports (don't change it after you've collected data)
- `l` — the label you see on screen
- `t` — `text`, `num`, `area` (multi-line), `sel` (dropdown), `multi` (pick several), `date`
- `o` — the options, for `sel` and `multi`
- `ph` — optional placeholder text

Add `only:'cem'` to a whole group to show it for one category only — that's how the Cemetery
Details block appears for cemeteries and stays out of the way everywhere else.

The current schema is my best reading of the combined fields from your two ArcGIS tables.
**Correct it against the real ones** — that's the first thing to do before serious fieldwork.

---

## Developing on Windows

```bash
npx http-server . -p 5183 -c-1
```

Then open `http://localhost:5183`. Geolocation and the compass need `localhost` or `https` —
opening `index.html` as a `file://` will not work.

Bump `BUILD` in **both** `index.html` and `sw.js` when you ship, same habit as Outdoor
Companion. The service worker is network-first for the app itself, so you'll never be stuck
on a stale build, and cache-first for map tiles, so tiles you've already viewed keep working
with no signal.

---

## Known limits

- Photos are downscaled to 2400px on the long edge by default (More → Capture Settings to
  turn off). Full-res iPhone photos are ~4 MB each and fill storage fast.
- The overlay stamp takes roughly a second per photo, so a 200-photo export takes a few
  minutes. Leave the screen on while it runs.
- Map tiles only work offline for areas you've already looked at. Pan over your target area
  at home, on wifi, before heading out.
- No cloud sync yet. That's the natural next step, using the same Firebase setup as Outdoor
  Companion.
