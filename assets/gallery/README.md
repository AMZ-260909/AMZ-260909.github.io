# Gallery thumbnails

The nine SVG studies are small grayscale placeholders created for layout testing.
Replace them with your own compressed JPG, PNG, WebP, or SVG thumbnails.
The full-resolution artwork stays on Behance.

Edit `gallery-data.js` in the repository root to manage the gallery:

- `image`: local thumbnail path, for example `assets/gallery/my-art.webp`.
- `width` and `height`: the thumbnail's actual pixel dimensions.
- `title`: the short caption displayed below the image.
- `url`: the full Behance project URL opened when the image or caption is clicked.

Copy an existing entry to add a picture, or remove an entry to hide it. Keep a
comma between entries. The CSS column layout fills top to bottom in each column;
the number of columns changes with the viewport width. Images keep their original
aspect ratios and are not cropped. Titles stay attached to their images.

Open `pics.html` locally to preview. No server or build step is required. Commit
and push the thumbnails, data file, and page code together to update GitHub Pages.
