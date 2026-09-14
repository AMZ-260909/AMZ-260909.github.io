# Self-hosted website fonts

The shared `style.css` imports the two local `font-face.css` files. All pages use
`"Inter", "Noto Sans SC", sans-serif`, including chapter text and content warnings.
There are no `local()` font sources: the website serves the bundled WOFF2 files.

- `inter/`: Fontsource Variable Inter 5.3.0, normal and italic, weights 100–900.
  Includes Latin, Latin Extended, Greek, Greek Extended, Vietnamese, Cyrillic,
  and Cyrillic Extended subsets. Latin letters, Greek letters, numbers, and
  shared punctuation use Inter first.
- `noto-sans-sc/`: Fontsource Variable Noto Sans SC 5.3.0, normal, weights 100–900.
  Includes the original Unicode subsets plus a supplemental WOFF2 generated
  from the complete official Google Fonts variable source. The supplement
  contains code points absent from the original web subsets, including less
  common Chinese characters. Chinese text and Chinese punctuation use Noto Sans SC.
- Each font directory includes its SIL Open Font License in `LICENSE.txt`.
- `manifest.json` lists every bundled font file and its size, plus the official
  supplemental source URL and SHA-256 hash.

Unicode ranges let browsers download only the subsets needed by the page.
`font-display: swap` permits a temporary fallback while files load; after loading,
the bundled fonts provide consistent font selection across operating systems.
Glyph rasterization may still vary slightly by browser and screen. Characters
outside both fonts' coverage may use the final generic sans-serif fallback.

The font stack does not change the site's font sizes, weights, line heights,
spacing, colors, or layout rules. Different glyph widths can naturally change
where text wraps. Keep the entire `assets/fonts/` directory when publishing.

Sources:
- https://fontsource.org/fonts/inter
- https://fontsource.org/fonts/noto-sans-sc
- https://github.com/google/fonts/tree/main/ofl/notosanssc
