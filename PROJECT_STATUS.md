# PROJECT_STATUS

## What this file is
- This is a handoff snapshot for the next chat session.
- It explains what is already built, what still needs polish, and what to do next.

## Current project state
- Stack: plain `HTML/CSS/JS`, no framework, no build step.
- Main files:
  - `index.html`
  - `style.css`
  - `script.js`
  - `assets/data/*.json` (content model)
  - `CHANGELOG.md`
- Site nav currently uses: `Home / Adventures / Work / Contact`.

## What is implemented
- Tab-based single-page navigation (no reload between tabs).
- JSON-driven content rendering for:
  - About/Profile
  - Work
  - Adventures
  - Contact
  - Media cards (Spotify, Beli, Goodreads, Letterboxd)
- Contact form UI wired to Formspree endpoint from `assets/data/contact.json`.
- Wide desktop layout with responsive behavior for smaller screens.
- Media panes:
  - App icon + text header
  - Multi-item content
  - Hidden scrollbars with scroll still working
- Beli rows include circular score bubbles (out of 10).
- Headshot card:
  - Apple Photos icon in top-left
  - 4-photo slideshow
  - 7-second interval
  - left-swipe transition (reverse slide removed)

## Current data files and purpose
- `assets/data/profile.json`: About text + slideshow photo list.
- `assets/data/work.json`: Work tab quote and cards.
- `assets/data/adventures.json`: Adventures quote and grid cards (currently placeholder-style).
- `assets/data/now.json`: Spotify/Beli/Goodreads/Letterboxd items.
- `assets/data/contact.json`: contact text, links, email, Formspree endpoint.

## Key decisions already made
- Keep content editable via JSON (no CMS yet).
- Use App Store icons for media card headers.
- Use online thumbnails for Spotify/Goodreads and online poster links for Letterboxd.
- Keep analytics out of v1 for now.

## Known caveats / polish candidates
- Some online poster/cover URLs can change over time (external dependency risk).
- Letterboxd posters are auto-matched from online sources; verify each title manually if exact art is important.
- Adventures tab is currently back in placeholder mode and needs real content pass.
- Contact form behavior depends on valid Formspree endpoint in `contact.json`.

## Priority next steps (recommended order)
1. Content pass for About/Work/Adventures (`[TBD]` replacements).
2. Verify all external links in `now.json` (Spotify/Beli/Goodreads/Letterboxd).
3. Manually QA Letterboxd poster matches and replace any mismatches.
4. Final mobile polish pass (spacing/line breaks/icon balance).
5. Set production `contact.json` values (real email, LinkedIn, Formspree endpoint).
6. Launch checklist run (navigation, links, form submit, responsiveness, image quality).

## How to start the next chat
- Prompt suggestion:
  - "Read `PROJECT_STATUS.md` and `CHANGELOG.md` first, then help me with: <next task>."

## Last updated
- 2026-05-07
