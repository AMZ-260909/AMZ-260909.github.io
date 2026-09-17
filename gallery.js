(() => {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;

  galleryItems.forEach((item, index) => {
    const figure = document.createElement("figure");
    figure.className = "gallery-item";
    const link = document.createElement("a");
    link.className = "gallery-link";
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `${item.title} — view on Behance (opens in a new tab)`);

    const image = document.createElement("img");
    image.src = item.image;
    image.alt = item.title;
    image.width = item.width;
    image.height = item.height;
    image.loading = index < 3 ? "eager" : "lazy";
    image.decoding = "async";

    const caption = document.createElement("figcaption");
    const captionLink = document.createElement("a");
    captionLink.href = item.url;
    captionLink.target = "_blank";
    captionLink.rel = "noopener noreferrer";
    captionLink.textContent = item.title;
    captionLink.setAttribute("aria-label", `${item.title} — view on Behance (opens in a new tab)`);
    caption.append(captionLink);
    link.append(image);
    figure.append(link, caption);
    gallery.append(figure);
  });
})();
