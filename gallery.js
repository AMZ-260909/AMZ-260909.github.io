(() => {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;

  galleryItems.forEach((item, index) => {
    const figure = document.createElement("figure");
    figure.className = "gallery-item";
    if (item.featured) figure.classList.add("gallery-item-featured");
    const preview = document.createElement("div");
    preview.className = "gallery-preview";

    const image = document.createElement("img");
    image.src = item.image;
    image.alt = item.title;
    image.width = item.width;
    image.height = item.height;
    image.loading = item.featured || index < 3 ? "eager" : "lazy";
    image.decoding = "async";

    const caption = document.createElement("figcaption");
    caption.textContent = item.title;
    preview.append(image);
    figure.append(preview, caption);
    gallery.append(figure);
  });
})();
