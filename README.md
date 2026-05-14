# GenSketches

Visual studies in p5.js exploring the **nuance and behavior of an Agent** for upcoming/future interfaces. Created for the Samsung January project.

Shared visual language: Samsung blue `#1697ff` on `#000`.

## Sketches

| # | Name | Idea |
|---|---|---|
| 01 | Morphing Grid | Circular dots smoothly interpolate between random target states — breathing, organic morphology. |
| 02 | Wave Squares | Square grid driven by a directional wave. Speed, frequency, and angle are tunable in real time. |
| 03 | Wave Circles | Circular grid with the same directional wave system — softer, more ambient counterpart to 02. |
| 04 | Text Mask | Dots reveal/conceal typographic content with push-style transitions. Agent "speaking" through dots. |
| 05 | Clock Mask | Dot field driven by a live clock mask. Density and text size tunable. Ambient, time-aware presence. |

## Run locally

Each sketch is a standalone static page. From the repo root:

```bash
# Any static server works. Two easy options:
python3 -m http.server 8000
# or
npx serve .
```

Then open <http://localhost:8000> and pick a sketch from the landing page.

You can also open `index.html` directly in a browser, but a local server is recommended so external fonts/CDN resources load without CORS issues.

## Structure

```
GenSketches/
├── index.html              # landing page
├── style.css               # landing page styles
├── 01-morphing-grid/
├── 02-wave-squares/
├── 03-wave-circles/
├── 04-text-mask/
└── 05-clock-mask/
```

Each sketch folder contains its own `index.html`, `sketch.js`, `style.css`, and vendored `p5.js` / `p5.sound.min.js` (the HTML actually loads p5 from CDN, but the local copies are kept from the original p5 web editor export).

## Tech

- [p5.js](https://p5js.org/) 1.11.x (via CDN)
- Vanilla HTML/CSS for the landing page
