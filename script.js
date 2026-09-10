// Load chapter likes relative to this shared script, including on nested pages.
if (document.querySelector(".chapter-page")) {
  const likesScript = document.createElement("script");
  likesScript.src = new URL("likes.js", document.currentScript.src).href;
  document.head.appendChild(likesScript);
}

function renderChapterText() {
  const source = document.getElementById("chapter-text");
  const reader = document.getElementById("reader");
  if (!source || !reader) return;

  const text = source.textContent.replace(/\r\n?/g, "\n").trim();
  const paragraphs = document.createDocumentFragment();

  if (text) {
    text.split(/\n[^\S\n]*\n(?:[^\S\n]*\n)*/).forEach((paragraph) => {
      const p = document.createElement("p");
      p.textContent = paragraph;
      paragraphs.appendChild(p);
    });
  }

  reader.replaceChildren(paragraphs);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderChapterText);
} else {
  renderChapterText();
}

function createRandomStars() {
  const field = document.querySelector(".starfield");
  if (!field) return;

  field.innerHTML = "";

  const area = window.innerWidth * window.innerHeight;
  const count = Math.max(45, Math.min(120, Math.floor(area / 13000)));

  for (let i = 0; i < count; i++) {
    const star = document.createElement("span");
    star.className = "star";

    const roll = Math.random();

    if (roll > 0.94) {
      star.classList.add("cross");
      star.textContent = Math.random() > 0.5 ? "✦" : "✧";
    } else if (roll > 0.80) {
      star.classList.add("big");
    }

    const size = (Math.random() * 1.5 + 0.7).toFixed(2);

    star.style.left = (Math.random() * 100).toFixed(2) + "%";
    star.style.top = (Math.random() * 100).toFixed(2) + "%";
    star.style.width = size + "px";
    star.style.height = size + "px";
    star.style.animationDuration = (1.8 + Math.random() * 4.8).toFixed(2) + "s";
    star.style.animationDelay = (-Math.random() * 6).toFixed(2) + "s";
    star.style.opacity = (0.2 + Math.random() * 0.7).toFixed(2);

    field.appendChild(star);
  }
}

createRandomStars();

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(createRandomStars, 250);
});

let readerSize = Number(localStorage.getItem("readerSize")) || 19;

function applyReaderSize() {
  document.documentElement.style.setProperty("--reader-size", readerSize + "px");
}
applyReaderSize();

document.querySelectorAll("[data-font-plus]").forEach((button) => {
  button.addEventListener("click", () => {
    readerSize = Math.min(readerSize + 1, 28);
    localStorage.setItem("readerSize", readerSize);
    applyReaderSize();
  });
});

document.querySelectorAll("[data-font-minus]").forEach((button) => {
  button.addEventListener("click", () => {
    readerSize = Math.max(readerSize - 1, 14);
    localStorage.setItem("readerSize", readerSize);
    applyReaderSize();
  });
});
