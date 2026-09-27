# Chapter illustrations

Store small chapter illustrations in this directory. In a chapter's `chapter-text`
block, put an image marker on its own line, with a blank line before and after:

```text
[image:assets/illustrations/my-picture.png]
```

Paths start with `assets/` and are relative to the website root, even though the
chapter is inside `novel-a/`. PNG, JPG, WebP, and SVG can be used. Images are centered,
displayed at their intrinsic size up to the text area's width, keep their aspect
ratio, and have no click-through link. Smaller images are not enlarged; larger
images shrink to fit the text area, including on narrow screens.

Chapter 13 currently uses `chapter-013-test.svg`. To replace it, add your image
here and update the marker's filename, including its extension. Do not rename a
PNG file to `.svg`. Remove the marker if the illustration is no longer needed.
