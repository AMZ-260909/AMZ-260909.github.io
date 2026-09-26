// Local heart feedback only: no database, counts, or stored visitor identifiers.
function initChapterLikes() {
  const reader = document.getElementById("reader");
  const match = location.pathname.match(/\/novel-a\/chapter-(\d{3})\.html$/);
  if (!reader || !match || document.querySelector(".chapter-likes")) return;
  const chapter = Number(match[1]);
  if (chapter < 1 || chapter > 343) return;

  const wrap = document.createElement("div");
  wrap.className = "chapter-likes";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "like-button";
  button.setAttribute("aria-label", "Send some love");
  const heart = document.createElement("span");
  heart.className = "like-heart";
  heart.textContent = "\u2665";
  heart.setAttribute("aria-hidden", "true");
  const status = document.createElement("span");
  status.className = "like-status";
  status.setAttribute("role", "status");
  button.append(heart);
  wrap.append(button, status);
  reader.after(wrap);

  let animationTimer;
  button.addEventListener("click", () => {
    clearTimeout(animationTimer);
    button.classList.remove("is-celebrating");
    // Restart the animation even when the heart is clicked repeatedly.
    void button.offsetWidth;
    button.classList.add("is-celebrating");
    status.textContent = "Thanks for the love";
    animationTimer = setTimeout(() => {
      button.classList.remove("is-celebrating");
    }, 650);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initChapterLikes);
} else {
  initChapterLikes();
}
