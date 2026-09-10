// Public browser configuration. Never put a secret/service_role key here.
const CHAPTER_LIKES_CONFIG = {
  url: "https://ywdunljaxlouiuzoijzt.supabase.co",
  publishableKey: "sb_publishable_sJ4I_AE1TysJj6OApw7BXQ_5xCXgJWf",
};

async function initChapterLikes() {
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
  button.disabled = true;
  button.setAttribute("aria-label", "点赞本章");
  button.setAttribute("aria-pressed", "false");
  const heart = document.createElement("span");
  heart.className = "like-heart";
  heart.textContent = "♥";
  heart.setAttribute("aria-hidden", "true");
  const count = document.createElement("span");
  count.className = "like-count";
  count.textContent = "—";
  const status = document.createElement("span");
  status.className = "like-status";
  status.setAttribute("role", "status");
  button.append(heart, count);
  wrap.append(button, status);
  reader.after(wrap);

  const { url, publishableKey } = CHAPTER_LIKES_CONFIG;
  if (!url || !publishableKey) {
    status.textContent = "点赞即将开放";
    return;
  }

  let visitor;
  try {
    visitor = localStorage.getItem("chapter-like-visitor");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitor || "")) {
      visitor = crypto.randomUUID();
      localStorage.setItem("chapter-like-visitor", visitor);
    }
  } catch {
    status.textContent = "请允许浏览器保存数据后再点赞";
    return;
  }

  async function request(action) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/${action}`, {
        method: "POST",
        headers: { apikey: publishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_number: chapter, visitor_id: visitor }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Likes request failed");
      const data = await response.json();
      if (!Number.isSafeInteger(data.count) || data.count < 0 || typeof data.liked !== "boolean") {
        throw new Error("Invalid likes response");
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  let loaded = false;
  function show(data) {
    loaded = true;
    count.textContent = String(data.count);
    button.setAttribute("aria-pressed", String(data.liked));
    button.setAttribute("aria-label", `${data.liked ? "已点赞" : "点赞本章"}，${data.count} 个赞`);
    button.disabled = data.liked;
    status.textContent = data.liked ? "谢谢你的喜欢" : "";
  }

  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = loaded ? "正在点赞…" : "正在加载…";
    try {
      show(await request(loaded ? "like_chapter" : "get_chapter_likes"));
    } catch {
      status.textContent = "暂时连接不上，点击爱心重试";
      button.disabled = false;
    }
  });

  try {
    show(await request("get_chapter_likes"));
  } catch {
    status.textContent = "暂时连接不上，点击爱心重试";
    button.disabled = false;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initChapterLikes);
} else {
  initChapterLikes();
}
