// =========================================================
// 这里是小特效。删掉任何一段都不会影响小说正文。
// =========================================================

// 夜间模式
const themeButtons = document.querySelectorAll("[data-theme-toggle]");
themeButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("darkMode", document.body.classList.contains("dark"));
  });
});
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark");
}

// 字号调节
let readerSize = Number(localStorage.getItem("readerSize")) || 19;
function applyReaderSize() {
  document.documentElement.style.setProperty("--reader-size", readerSize + "px");
}
applyReaderSize();

document.querySelectorAll("[data-font-plus]").forEach(btn => {
  btn.addEventListener("click", () => {
    readerSize = Math.min(readerSize + 1, 28);
    localStorage.setItem("readerSize", readerSize);
    applyReaderSize();
  });
});
document.querySelectorAll("[data-font-minus]").forEach(btn => {
  btn.addEventListener("click", () => {
    readerSize = Math.max(readerSize - 1, 14);
    localStorage.setItem("readerSize", readerSize);
    applyReaderSize();
  });
});

// 鼠标星星拖尾（手机不会触发）
let lastStar = 0;
document.addEventListener("mousemove", (e) => {
  const now = Date.now();
  if (now - lastStar < 55) return;
  lastStar = now;

  const star = document.createElement("span");
  star.className = "trail-star";
  star.textContent = ["✦","⋆","✧","♡"][Math.floor(Math.random() * 4)];
  star.style.left = e.clientX + "px";
  star.style.top = e.clientY + "px";
  document.body.appendChild(star);
  setTimeout(() => star.remove(), 850);
});
