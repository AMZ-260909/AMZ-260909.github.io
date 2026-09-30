# Gallery thumbnails

The nine SVG studies are small grayscale placeholders created for layout testing.
Replace them with your own compressed JPG, PNG, WebP, or SVG thumbnails.
Images and captions are displayed locally without outgoing links.

Edit `gallery-data.js` in the repository root to manage the gallery:

- `image`: local thumbnail path, for example `assets/gallery/my-art.webp`.
- `width` and `height`: the thumbnail's actual pixel dimensions.
- `title`: the short caption displayed below the image.
- `featured`: set to `true` to span the full gallery width. Put this entry first
  in the list to display it above the masonry images. Omit it for regular images.

Copy an existing entry to add a picture, or remove an entry to hide it. Keep a
comma between entries. The CSS column layout fills top to bottom in each column;
the number of columns changes with the viewport width. Images keep their original
aspect ratios and are not cropped. Titles stay attached to their images.

Open `pics.html` locally to preview. No server or build step is required. Commit
and push the thumbnails, data file, and page code together to update GitHub Pages.
