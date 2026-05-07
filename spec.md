# williambartnett.com — Build Spec

## Stack
- Plain HTML/CSS/JS (no framework)
- Single `index.html` with tab-based navigation (no page reloads)
- Hosted on GitHub Pages

---

## Fonts (via Google Fonts)
- **Headings:** `DM Serif Display` — elegant, editorial
- **Body:** `DM Sans` — clean, modern sans-serif
- Import both from Google Fonts in <head>

---

## Global Design System
- Background: `#ffffff`
- Card/box background: `#f2f2f2` (light grey)
- Border radius on all cards: `16px`
- Font color: `#1a1a1a`
- Secondary text: `#666666`
- Max content width: `860px`, centered
- All cards have subtle box-shadow: `0 1px 4px rgba(0,0,0,0.06)`
- No borders on cards — rely on background contrast only

---

## Navigation
- Pill-shaped bubble nav bar, centered top of page
- Background: `#f2f2f2`, border-radius: `999px`
- Four tabs: **William · Work · Adventures · Contact**
- Active tab: white pill with slight shadow inside the grey bar
- Smooth fade transition between tabs (no page reload)

---

## TAB: William

Two-column layout, 50/50 split, gap `24px`

### Left column — "What I'm About"
- Section heading: "What I'm About" in DM Serif Display
- Three subsections as separate grey cards stacked vertically:
  - **Where I'm From** — placeholder text: `[TBD]`
  - **What I Used to Do** — placeholder text: `[TBD]`
  - **What I Do Now** — placeholder text: `[TBD]`
- Each card: `padding: 24px`, rounded corners

### Right column — top to bottom
1. **Photo card** — full-width rectangle, `aspect-ratio: 4/3`
   - `<img>` tag with `src="assets/photo.jpg"`, `object-fit: cover`
2. **Row of 2 equal squares:**
   - **Spotify card** — Spotify green `#1DB954` icon top-left, bold title "What I'm Listening To", album art placeholder (grey square), song title + artist as editable text, hyperlinked to Spotify URL
   - **Beli card** — Beli orange `#FF6B35` icon top-left, bold title "Where I'm Eating", restaurant name + location as editable text, star rating (plain text e.g. "⭐ 4.8"), hyperlinked to Beli URL
3. **Row of 2 equal squares:**
   - **Goodreads card** — Goodreads brown `#553B08` icon top-left, bold title "What I'm Reading", book cover placeholder (grey rect), book title + author as editable text, hyperlinked to Goodreads URL
   - **Letterboxd card** — Letterboxd green `#00C030` icon top-left, bold title "What I'm Watching", film title + year as editable text, star rating (e.g. "★★★★"), hyperlinked to Letterboxd URL
4. **Contact card** — full-width rectangle (see Contact tab spec below, duplicated here)

> **Manual update pattern:** All content in the media cards is hardcoded in the HTML. To update, edit the text and URL directly in `index.html`. No CMS needed.

---

## TAB: Work

- Centered italic quote at top:
  > *"Determine never to be idle. No person will have occasion to complain of the want of time, who never loses any. It is wonderful how much may be done, if we are always doing."*
  > — Thomas Jefferson

- Full-width stacked grey cards below, each with:
  - Bold heading left-aligned
  - Body text below (placeholder `[TBD]`)
  - Cards in order: **Vibe Coding · Banking · University · High School**

---

## TAB: Adventures

- Centered italic quote at top:
  > *"Life is not a spectator sport!"*

- Photo grid: 4 columns, auto rows
- Each photo card:
  - Image fills card, `object-fit: cover`
  - Overlay text on top of image (semi-transparent dark gradient at bottom)
  - **Header** (white, bold) and **subtext** (white, smaller) overlaid on image
  - All placeholder for now: grey boxes with `[Photo]`, `[Header]`, `[Subtext]`

---

## TAB: Contact

Replicate marco.fyi contact section:
- Left: short paragraph — "I'd love to connect. Reach out anytime." + William's name
- Right or inline: headshot photo (same `assets/photo.jpg`)
- Icon links row:
  - **LinkedIn icon** → `https://linkedin.com/in/[TBD]`
  - **Email icon** → `mailto:[TBD]`
- Style: clean, text-forward, no form — just display info and icons

---

## File Structure
/
├── index.html
├── style.css
├── script.js
└── assets/
├── photo.jpg        ← replace with real photo
└── [album/book covers if needed]

---

## Notes for Cursor
- Do not use any JS framework or build tool
- All tab switching via vanilla JS classList toggle
- Use CSS Grid for the William right-column layout
- All media cards should have a consistent internal layout: icon + label row on top, content in middle, link at bottom
- Placeholder content marked with `[TBD]` throughout — easy to grep and replace
- Mobile responsive: stack columns on screens < 768px