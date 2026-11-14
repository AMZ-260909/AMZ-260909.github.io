// Chapter paste tool: UI + GitHub. Text logic lives in paste-core.js.
(function () {
  "use strict";

  const C = window.PasteCore;
  const OWNER = "AMZ-260909";
  const REPO = "AMZ-260909.github.io";
  const BRANCH = "main";
  const SITE = "https://amz-260909.github.io/";
  const API = "https://api.github.com";
  const KEY_TOKEN = "chapter-tool:token";
  const KEY_TYPO = "chapter-tool:fix-typography";

  const $ = (id) => document.getElementById(id);

  // ---------- small helpers ----------

  function store(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) { /* private mode etc. */ }
  }

  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function el(tag, props, ...children) {
    const node = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
        else if (k in node && typeof v !== "string") node[k] = v;
        else node.setAttribute(k, v === true ? "" : v);
      }
    }
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  function say(id, text, kind) {
    const node = $(id);
    node.textContent = text || "";
    node.className = "msg" + (kind ? " " + kind : "");
  }

  function chapterRange(numbers) {
    const list = numbers.slice().sort((a, b) => a - b);
    if (!list.length) return "";
    const contiguous = list.every((n, i) => i === 0 || n === list[i - 1] + 1);
    if (list.length === 1) return "第" + list[0] + "章";
    if (contiguous) return "第" + list[0] + "–" + list[list.length - 1] + "章";
    return "第" + list.join("、") + "章";
  }

  function sameList(a, b) {
    return a.length === b.length && a.every((x, i) => x === b[i]);
  }

  async function pool(items, limit, fn) {
    let next = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i], i);
      }
    });
    await Promise.all(workers);
  }

  // ---------- GitHub ----------

  let token = load(KEY_TOKEN) || "";

  async function gh(path, opts) {
    const o = opts || {};
    const headers = {
      Authorization: "Bearer " + (o.token || token),
      Accept: o.raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
    };
    if (o.body) headers["Content-Type"] = "application/json";
    let res;
    try {
      res = await fetch(API + path, {
        method: o.method || "GET",
        headers,
        body: o.body ? JSON.stringify(o.body) : undefined,
        cache: "no-store",
      });
    } catch (e) {
      const err = new Error("连不上 GitHub，检查一下网络再试。");
      err.status = 0;
      throw err;
    }
    if (!res.ok) {
      let detail = "";
      try { detail = (await res.json()).message || ""; } catch (e) { /* not json */ }
      const err = new Error(detail || "GitHub 返回 " + res.status);
      err.status = res.status;
      throw err;
    }
    return o.raw ? res.text() : res.json();
  }

  const repoPath = "/repos/" + OWNER + "/" + REPO;

  function friendly(err) {
    if (err.status === 401) return "钥匙不对或者过期了，在上面删掉钥匙、换一把新的。";
    if (err.status === 403) return "钥匙没有写入权限。新建钥匙时 Contents 要选 Read and write。（" + err.message + "）";
    if (err.status === 404) return "钥匙看不到网站仓库。新建钥匙时 Repository access 要选 AMZ-260909.github.io。";
    return err.message;
  }

  async function headCommit() {
    const ref = await gh(repoPath + "/git/ref/heads/" + BRANCH);
    const commit = await gh(repoPath + "/git/commits/" + ref.object.sha);
    return { commit: ref.object.sha, tree: commit.tree.sha };
  }

  async function readFile(path, ref) {
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    return gh(repoPath + "/contents/" + encoded + "?ref=" + ref, { raw: true });
  }

  async function commitFiles(base, files, message) {
    const tree = await gh(repoPath + "/git/trees", {
      method: "POST",
      body: {
        base_tree: base.tree,
        tree: files.map((f) => ({ path: f.path, mode: "100644", type: "blob", content: f.content })),
      },
    });
    const commit = await gh(repoPath + "/git/commits", {
      method: "POST",
      body: { message, tree: tree.sha, parents: [base.commit] },
    });
    await moveBranch(commit.sha);
    return { commit: commit.sha, tree: tree.sha };
  }

  async function moveBranch(sha) {
    try {
      await gh(repoPath + "/git/refs/heads/" + BRANCH, { method: "PATCH", body: { sha, force: false } });
    } catch (err) {
      if (err.status === 422 || err.status === 409) {
        const e = new Error("网站在你点“切章并对比”之后又有了新改动（可能是 VS Code 那边推了东西）。什么都没发出去；请重新点“切章并对比”，再发布。");
        e.status = 422;
        throw e;
      }
      throw err;
    }
  }

  // ---------- step 1: the key ----------

  function showKeyState(user) {
    $("keySaved").hidden = !user;
    $("keyForm").hidden = Boolean(user);
    $("keyUser").textContent = user || "";
  }

  async function checkKey(candidate) {
    const me = await gh("/user", { token: candidate });
    await gh(repoPath, { token: candidate });
    return me.login;
  }

  $("keySave").addEventListener("click", async () => {
    const candidate = $("keyInput").value.trim();
    if (!candidate) { say("keyMsg", "先把钥匙粘进框里。", "bad"); return; }
    say("keyMsg", "正在检查钥匙……");
    try {
      const login = await checkKey(candidate);
      token = candidate;
      store(KEY_TOKEN, token);
      $("keyInput").value = "";
      say("keyMsg", "");
      showKeyState(login);
    } catch (err) {
      say("keyMsg", friendly(err), "bad");
    }
  });

  $("keyForget").addEventListener("click", () => {
    token = "";
    store(KEY_TOKEN, null);
    showKeyState(null);
  });

  if (token) {
    showKeyState("（检查中）");
    checkKey(token).then(showKeyState, (err) => {
      if (err.status === 401 || err.status === 404) {
        token = "";
        store(KEY_TOKEN, null);
        showKeyState(null);
        say("keyMsg", friendly(err), "bad");
      } else {
        showKeyState("已保存");
      }
    });
  } else {
    showKeyState(null);
  }

  // ---------- step 2: paste and compare ----------

  const fixBox = $("fixTypo");
  fixBox.checked = load(KEY_TYPO) !== "off";
  fixBox.addEventListener("change", () => {
    store(KEY_TYPO, fixBox.checked ? "on" : "off");
    if (state) {
      state.items.forEach((item) => { item.fixTypography = fixBox.checked; });
      renderPreview();
    }
  });

  $("clearBtn").addEventListener("click", () => {
    $("pasteBox").value = "";
    $("previewPanel").hidden = true;
    state = null;
    say("compareMsg", "");
  });

  let state = null;

  $("compareBtn").addEventListener("click", compare);

  async function compare() {
    $("donePanel").hidden = true;
    if (!token) { say("compareMsg", "先在第 1 步放好钥匙。", "bad"); return; }
    const pasted = $("pasteBox").value;
    const split = C.splitChapters(pasted);
    if (!split.chapters.length) {
      say("compareMsg", "没找到章标题。复制时要连着“第十章 呦呦鹿鸣”这样单独一行的标题一起复制。", "bad");
      return;
    }
    const button = $("compareBtn");
    button.disabled = true;
    say("compareMsg", "正在读网站上现在的版本……");
    try {
      const base = await headCommit();
      const worksHtml = await readFile("works.html", base.commit);
      const total = Number((/const totalChapters = (\d+);/.exec(worksHtml) || [])[1]) || 0;
      const warnings = [];
      if (split.leading.trim()) {
        const peek = split.leading.trim().slice(0, 40);
        warnings.push("第一个章标题前面还有文字，没有用上：“" + peek + (split.leading.trim().length > 40 ? "……" : "") + "”");
      }
      const seen = new Set();
      const items = [];
      for (const ch of split.chapters) {
        if (seen.has(ch.number)) {
          warnings.push("第" + ch.number + "章粘了两次，只用了前一次。");
          continue;
        }
        seen.add(ch.number);
        items.push({
          number: ch.number,
          title: ch.title,
          lines: ch.lines,
          fixTypography: fixBox.checked,
          keepImages: true,
          error: "",
        });
      }
      await pool(items, 6, async (item) => {
        if (total && item.number > total) {
          item.error = "网站目录只有 " + total + " 章，没有第" + item.number + "章的页面，跳过。";
          return;
        }
        try {
          item.oldHtml = await readFile("novel-a/chapter-" + C.pad3(item.number) + ".html", base.commit);
          item.old = C.parsePage(item.oldHtml);
        } catch (err) {
          item.error = err.status === 404
            ? "网站上没有第" + item.number + "章的页面，跳过。"
            : "读不到网站上的第" + item.number + "章：" + friendly(err);
          return;
        }
        item.cw = item.old.cw;
        if (!item.title) {
          const oldTitle = item.old.heading.replace(/^\d+\s*/, "");
          if (oldTitle) {
            item.title = oldTitle;
            item.titleNote = "Word 里这章没写章名，沿用网站上的“" + oldTitle + "”。";
          }
        }
        if (!C.toParagraphs(item.lines, {}).length) item.error = "这一章只有标题没有正文，跳过。";
      });
      state = {
        base,
        works: { html: worksHtml, published: C.readPublishedThrough(worksHtml) },
        items,
        warnings,
      };
      say("compareMsg", "");
      renderPreview();
      $("previewPanel").hidden = false;
      $("previewPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      say("compareMsg", friendly(err), "bad");
    } finally {
      button.disabled = false;
    }
  }

  // ---------- step 3: preview ----------

  function compute(item) {
    let paragraphs = C.toParagraphs(item.lines, { fixTypography: item.fixTypography });
    let placed = [];
    if (item.keepImages) {
      const carried = C.carryImages(item.old.paragraphs, paragraphs);
      paragraphs = carried.paragraphs;
      placed = carried.placed;
    }
    const heading = C.headingText(item.number, item.title);
    const cw = C.normalizeCw(item.cw);
    const oldImages = item.old.paragraphs.filter(C.isImage).length;
    const isNew = item.old.paragraphs.length === 0;
    const blocks = isNew ? [] : C.changeBlocks(item.old.paragraphs, paragraphs);
    const textChanged = !sameList(item.old.paragraphs, paragraphs);
    const headingChanged = item.old.heading !== heading;
    const cwChanged = cw !== item.old.cw;
    const unsafe = C.unsafeText(paragraphs);
    return {
      paragraphs, placed, heading, cw, oldImages, isNew, blocks, unsafe,
      textChanged, headingChanged, cwChanged,
      changed: !unsafe && (textChanged || headingChanged || cwChanged),
    };
  }

  function badgeFor(item, r) {
    if (item.error) return el("span", { class: "badge skip", text: "跳过" });
    if (r.unsafe) return el("span", { class: "badge skip", text: "有问题" });
    if (!r.changed) return el("span", { class: "badge same", text: "没变" });
    if (r.isNew) return el("span", { class: "badge new", text: "新章" });
    const parts = [];
    if (r.textChanged) parts.push("正文改了 " + r.blocks.length + " 处");
    if (r.headingChanged) parts.push("章名改了");
    if (r.cwChanged) parts.push("CW 改了");
    return el("span", { class: "badge changed", text: parts.join(" · ") });
  }

  function renderPreview() {
    const box = $("chapters");
    box.replaceChildren();
    const warnings = $("warnings");
    warnings.replaceChildren(...state.warnings.map((w) => el("li", { text: w })));

    let changedCount = 0;
    const results = new Map();
    for (const item of state.items) {
      if (item.error) continue;
      const r = compute(item);
      results.set(item, r);
      if (r.changed) changedCount++;
    }
    const openByDefault = changedCount <= 3;

    for (const item of state.items) {
      const r = results.get(item);
      const name = item.error ? C.pad3(item.number) + " " + (item.title || "") : r.heading;
      const card = el("details", { class: "chapter-card", open: !item.error && r.changed && openByDefault });
      card.append(el("summary", null, el("span", { class: "ch-name", text: name }), badgeFor(item, r)));
      if (item.error) {
        card.append(el("p", { class: "note bad", text: item.error }));
        box.append(card);
        continue;
      }
      card.append(renderCard(item, r));
      box.append(card);
    }

    const skipped = state.items.filter((i) => i.error).length;
    const same = state.items.length - skipped - changedCount;
    const bits = ["识别到 " + state.items.length + " 章"];
    if (changedCount) bits.push("要更新 " + changedCount + " 章");
    if (same) bits.push(same + " 章和网站上一样，不动");
    if (skipped) bits.push(skipped + " 章跳过");
    $("summary").textContent = bits.join("，") + "。";

    // light up the directory
    const maxNumber = Math.max(...state.items.filter((i) => !i.error).map((i) => i.number), 0);
    const published = state.works.published;
    const row = $("publishedRow");
    state.lightUpTo = published !== null && maxNumber > published ? maxNumber : null;
    row.hidden = state.lightUpTo === null;
    if (state.lightUpTo !== null) {
      $("lightUpText").textContent = "目录里点亮到第 " + state.lightUpTo + " 章（现在点亮到第 " + published + " 章）";
      if (state.lightUpDefaultFor !== state.lightUpTo) {
        // Tick it by default only when this paste fills every chapter up to the new end,
        // so publishing ch46 alone doesn't light up 10–45 by accident.
        const have = new Set(state.items.filter((i) => !i.error).map((i) => i.number));
        let complete = true;
        for (let n = published + 1; n <= state.lightUpTo; n++) if (!have.has(n)) { complete = false; break; }
        $("lightUp").checked = complete;
        state.lightUpDefaultFor = state.lightUpTo;
      }
    }
    state.results = results;
    state.changedCount = changedCount;
    updatePublishButton();
  }

  function renderCard(item, r) {
    const body = el("div", { class: "card-body" });

    if (r.headingChanged) {
      body.append(el("p", { class: "note", text: "章名：网站上是“" + item.old.heading + "”，改成“" + r.heading + "”。" }));
    }
    if (item.titleNote) body.append(el("p", { class: "note", text: item.titleNote }));
    if (r.unsafe) body.append(el("p", { class: "note bad", text: r.unsafe }));

    if (r.oldImages) {
      const guessed = r.placed.filter((p) => p.how === "guess").length;
      let text;
      if (!item.keepImages) text = "网站上这章有 " + r.oldImages + " 张插图，这次不保留。";
      else if (!r.placed.length) text = "粘贴的正文里自己带了插图标记，按你写的位置放。";
      else if (guessed) text = "网站上这章有 " + r.oldImages + " 张插图，已放回；其中 " + guessed + " 张找不到原来那段，位置是估的，去“全文”里看一眼。";
      else text = "网站上这章有 " + r.oldImages + " 张插图，已放回原来的位置。";
      body.append(el("p", { class: "note" + (guessed && item.keepImages ? " warn" : ""), text }));
      const keep = el("input", { type: "checkbox", checked: item.keepImages });
      keep.addEventListener("change", () => { item.keepImages = keep.checked; renderPreview(); });
      body.append(el("label", { class: "check" }, keep, " 保留插图"));
    }

    const cwInput = el("input", { type: "text", value: item.cw || "", placeholder: "不需要就空着，例如：CW: Non-main character death" });
    cwInput.addEventListener("change", () => { item.cw = cwInput.value; renderPreview(); });
    body.append(el("label", { class: "cw-field" }, el("span", { text: "CW 提示" }), cwInput));

    const views = el("div", { class: "views" });
    const diffBtn = el("button", { type: "button", class: "tab", text: "改了什么" });
    const fullBtn = el("button", { type: "button", class: "tab", text: "全文" });
    const pane = el("div", { class: "pane" });
    const show = (which) => {
      diffBtn.classList.toggle("on", which === "diff");
      fullBtn.classList.toggle("on", which === "full");
      pane.replaceChildren(which === "diff" ? renderDiff(item, r) : renderFull(r.paragraphs));
    };
    diffBtn.addEventListener("click", () => show("diff"));
    fullBtn.addEventListener("click", () => show("full"));
    views.append(el("div", { class: "tabs" }, diffBtn, fullBtn), pane);
    body.append(views);
    show(r.isNew ? "full" : "diff");
    return body;
  }

  function renderDiff(item, r) {
    const wrap = el("div", { class: "diff" });
    if (r.isNew) {
      wrap.append(el("p", { class: "note", text: "网站上这章原来是空页，下面整章都是新的。" }));
      return wrap;
    }
    if (!r.textChanged) {
      wrap.append(el("p", { class: "note", text: "正文和网站上一字不差。" }));
      return wrap;
    }
    for (const block of r.blocks) {
      const group = el("div", { class: "diff-block" });
      if (block.before) {
        const tail = Array.from(block.before);
        group.append(el("p", { class: "context", text: "……" + tail.slice(-24).join("") }));
      } else {
        group.append(el("p", { class: "context", text: "（开头）" }));
      }
      if (block.removed.length === 1 && block.added.length === 1) {
        const p = el("p", { class: "para" });
        for (const run of C.diffChars(block.removed[0], block.added[0])) {
          if (run.op === "=") p.append(run.value);
          else p.append(el(run.op === "-" ? "del" : "ins", { text: run.value }));
        }
        group.append(p);
      } else {
        for (const text of block.removed) group.append(el("p", { class: "para" }, el("del", { text })));
        for (const text of block.added) group.append(el("p", { class: "para" }, el("ins", { text })));
      }
      wrap.append(group);
    }
    return wrap;
  }

  function renderFull(paragraphs) {
    const article = el("article", { class: "reader preview-reader" });
    for (const p of paragraphs) {
      const m = /^\[image:(assets\/[^\r\n\[\]]+)\]$/.exec(p);
      if (m) {
        article.append(el("figure", { class: "reader-illustration" }, el("img", { src: "../" + m[1], alt: "插图", loading: "lazy" })));
      } else {
        article.append(el("p", { text: p }));
      }
    }
    return article;
  }

  // ---------- step 4: publish ----------

  const publishBtn = $("publishBtn");
  let armed = null;

  function plannedFiles() {
    const files = [];
    const numbers = [];
    for (const item of state.items) {
      const r = state.results.get(item);
      if (!r || !r.changed) continue;
      numbers.push(item.number);
      files.push({
        path: "novel-a/chapter-" + C.pad3(item.number) + ".html",
        content: C.buildPage(item.oldHtml, { number: item.number, title: item.title, paragraphs: r.paragraphs, cw: item.cw }),
      });
    }
    let lit = null;
    if (state.lightUpTo !== null && $("lightUp").checked) {
      lit = state.lightUpTo;
      files.push({ path: "works.html", content: C.setPublishedThrough(state.works.html, lit) });
    }
    return { files, numbers, lit };
  }

  function updatePublishButton() {
    disarm();
    const plan = plannedFiles();
    const n = plan.numbers.length;
    publishBtn.disabled = plan.files.length === 0;
    publishBtn.textContent = n ? "发布这 " + n + " 章" : plan.lit ? "只点亮目录" : "没有要发布的";
  }

  function disarm() {
    if (armed) { clearTimeout(armed); armed = null; }
    publishBtn.classList.remove("armed");
  }

  $("lightUp").addEventListener("change", () => { if (state) updatePublishButton(); });

  publishBtn.addEventListener("click", async () => {
    const plan = plannedFiles();
    if (!plan.files.length) return;
    if (!armed) {
      publishBtn.textContent = "确定发布？再点一次";
      publishBtn.classList.add("armed");
      armed = setTimeout(updatePublishButton, 6000);
      return;
    }
    disarm();
    publishBtn.disabled = true;
    say("publishMsg", "正在发布……");
    const parts = [];
    if (plan.numbers.length) parts.push("更新" + chapterRange(plan.numbers));
    if (plan.lit) parts.push("目录点亮到第" + plan.lit + "章");
    const message = parts.join("，") + "（章节工具）";
    try {
      const done = await commitFiles(state.base, plan.files, message);
      lastPublish = { commit: done.commit, parentTree: state.base.tree, numbers: plan.numbers };
      say("publishMsg", "");
      showDone(plan, done.commit);
      $("previewPanel").hidden = true;
      state = null;
    } catch (err) {
      say("publishMsg", friendly(err), "bad");
      publishBtn.disabled = false;
      updatePublishButton();
    }
  });

  // ---------- done + undo ----------

  let lastPublish = null;

  function showDone(plan, sha) {
    const links = $("doneLinks");
    links.replaceChildren(
      ...plan.numbers.sort((a, b) => a - b).map((n) => {
        const url = SITE + "novel-a/chapter-" + C.pad3(n) + ".html";
        return el("li", null, el("a", { href: url, target: "_blank", rel: "noopener", text: "第" + n + "章" }));
      })
    );
    if (plan.lit) links.append(el("li", null, el("a", { href: SITE + "works.html", target: "_blank", rel: "noopener", text: "目录（点亮到第" + plan.lit + "章）" })));
    $("doneCommit").href = "https://github.com/" + OWNER + "/" + REPO + "/commit/" + sha;
    $("undoBtn").hidden = false;
    $("undoBtn").disabled = false;
    $("undoBtn").textContent = "撤销刚才这次发布";
    say("undoMsg", "");
    $("donePanel").hidden = false;
    $("donePanel").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  let undoArmed = null;
  $("undoBtn").addEventListener("click", async () => {
    const btn = $("undoBtn");
    if (!lastPublish) return;
    if (!undoArmed) {
      btn.textContent = "确定撤销？再点一次";
      btn.classList.add("armed");
      undoArmed = setTimeout(() => {
        undoArmed = null;
        btn.textContent = "撤销刚才这次发布";
        btn.classList.remove("armed");
      }, 6000);
      return;
    }
    clearTimeout(undoArmed);
    undoArmed = null;
    btn.classList.remove("armed");
    btn.disabled = true;
    say("undoMsg", "正在撤销……");
    try {
      const ref = await gh(repoPath + "/git/ref/heads/" + BRANCH);
      if (ref.object.sha !== lastPublish.commit) {
        throw new Error("这次发布之后网站又有了新改动，没法一键撤销了。什么都没动；去跟 Claude 说一声。");
      }
      const commit = await gh(repoPath + "/git/commits", {
        method: "POST",
        body: {
          message: "撤销：" + (lastPublish.numbers.length ? "更新" + chapterRange(lastPublish.numbers) : "目录点亮") + "（章节工具）",
          tree: lastPublish.parentTree,
          parents: [lastPublish.commit],
        },
      });
      await moveBranch(commit.sha);
      lastPublish = null;
      btn.hidden = true;
      say("undoMsg", "撤销好了，网站一两分钟后变回发布前的样子。", "good");
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "撤销刚才这次发布";
      say("undoMsg", friendly(err), "bad");
    }
  });
})();
