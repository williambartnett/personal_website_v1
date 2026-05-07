# Changelog

## 2026-05-07
- Created initial personal website scaffold with `index.html`, `style.css`, and `script.js`.
- Added JSON content model in `assets/data/` for profile, work, now, adventures, and contact.
- Added marco-inspired contact card UI with LinkedIn + email links and form submission wiring.
- Added interactive Prev/Next carousel behavior for Spotify, Beli, Goodreads, and Letterboxd panes with multi-item support in `assets/data/now.json`.
- Widened overall page layout and card widths.
- Changed "What I'm About" to a single grey panel with heading and subsections inside the same bar.
- Reworked Spotify/Beli/Goodreads/Letterboxd panes to show multiple visible entries in native-inspired list/grid styles.
- Copied uploaded screenshots into `assets/images/media/` and connected them as pane thumbnails.
- Added automatic thumbnail fallback logic by pane type and removed "Open App" text from media cards.
- Cropped true item thumbnails (album covers, book covers, poster tiles, and restaurant post photos) from uploaded screenshots.
- Hid visible scrollbars while preserving scroll behavior in all media panes.
- Replaced pane text headers with top-right app icon badges.
- Updated Beli entries to Lafayette Tavern, Bar Gyu+, and McDonald's Budapest.
- Re-cropped thumbnails with tighter bounds to remove frame bleed across pane items.
- Pulled official App Store app icons (Spotify, Beli, Goodreads, Letterboxd) and left-aligned them in media cards.
- Added Beli-style `/10` score bubbles on each restaurant row.
- Restored "What I'm [activity]" text labels to the right of app icons in media card headers.
- Switched Spotify and Goodreads thumbnails to online sources (iTunes/OpenLibrary covers).
- Expanded Letterboxd to a scrollable 3x2 poster wall with a longer movie list from your screenshot and online IMDb poster links.
- Updated top navigation labels/order to `Home / Adventures / Work / Contact`.
- Restored Adventures tab content cards back to placeholder-image mode.
- Restyled "What I'm About" panel typography to match your reference layout style.
- Increased global content width for a wider, consistent layout across all pages.
- Restored top-right headshot card with a 4-photo slideshow rotating every 5 seconds.
- Added Apple Photos app icon badge to the top-left of the headshot pane.
