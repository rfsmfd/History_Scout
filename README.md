# History Scout

**Record today. Preserve tomorrow.**

A field app for documenting old places — homesteads, churches, schools, cemeteries, archaeological sites and stores. Photograph a site and the app records where you stood, which way you faced, and when. The writing up happens later, on the phone or at a desk, and the records are the same in both places.

**Live:** https://rfsmfd.github.io/History_Scout/ · **BUILD 14**

---

## What it does

**In the field, on a phone**
- One tap to photograph, one tap for the category. Under ten seconds, with gloves, with no signal.
- Position, accuracy, elevation, date, time and compass heading recorded with every photo.
- Photos taken near the site you are working on join it automatically; the bar on screen always says where they are landing.
- Your last photo shown large, with **Check sharpness** (zoom to full detail) and **Delete and retake**.

**At the desk, on a computer**
- The same records in a two-pane layout: sites on the left, the full record and large photos on the right.
- **Bring in new** files photos into `Photos\Category\Site\` on a folder you choose, and writes lists for ArcGIS, QGIS or Excel into `Records\`.
- **Check for edited photos** finds `… edited.jpg` files you saved beside the originals in Photoshop and puts them into their records.

**Between them**
- Records back themselves up and sync both ways, with each field keeping its newest edit — an edit made with no signal never overwrites a newer one made elsewhere.
- Photos go up when you press **Send**, confirmed at their exact size, and are never removed from the device.
- Deletes are marked, not erased, and can be restored on any device.

## The record

The form is a working GIS template (`MASTER_Point_Template`): NAMEFEATURE, AlternateName, HistoricName, Description, NOTES, Information, YEAR, SourceDate, Category, FeatureType, Source1, Source2, Evidence, Confidence, DHR_Number, GISCORDS, FeatureID — spelled as the geodatabase spells them, so an export drops in without renaming. Extra survey fields (condition, materials, roof, threats, cemetery detail) live in a collapsed section below. Sites can be marked **sensitive**, which keeps their coordinates off stamped copies and flags them in exports.

## Exports

- **ZIP** — photos as `Photos/Category/Site/Site 01.jpg`, your edited versions beside them, optional stamped copies, and `For ArcGIS/` with sites.csv, photos.csv and sites.geojson.
- **CSV** and **GeoJSON** on their own.
- **Bring in new** writes the same information straight into folders, without a ZIP.

## Your account

Sign-in is offered, never required: without an account everything works and stays on the device. With one, records and photos are kept in a private store that only that signed-in, email-confirmed, approved account can read. Access is by approval — an account alone opens nothing.

## How it is built

A single `index.html` plus `sw.js`, served from GitHub Pages, added to the iPhone home screen as a web app. No build step, no framework, no store review: edit, push to `main`, and it is live in about a minute.

- `index.html` — the whole app: UI, IndexedDB storage, sync, exports.
- `sw.js` — the offline helper. The app itself is fetched network-first with a 2-second timeout; libraries and map tiles are served from the cache.
- `firestore.rules`, `storage.rules` — who can read and write what. Deployed with `firebase deploy --only firestore:rules,storage`.
- `manifest.webmanifest`, `icon-*.png`, `splash.jpg` — the home-screen icon and the sign-in page artwork.

**When shipping a change, bump `BUILD` in BOTH `index.html` and `sw.js`.** The number names the cache, and the app compares it with the server to offer the update banner.

Libraries (Leaflet, EXIF, JSZip, Firebase) load from public CDNs and are cached for offline use. There is nothing to install to work on this app.

## Testing

Serve the folder over HTTP — a file:// page has no service worker and no geolocation:

```
npx http-server . -p 5183 -c-1
```

Then open http://localhost:5183. Check `BUILD` in both files before pushing.

---

Built for Faison Digital Works, LLC. Documents, artwork and the design Blueprint live outside this repository, in `Desktop\FAISON DIGITAL WORKS\HISTORY APP`.
