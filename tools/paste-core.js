// Pure helpers for the chapter paste tool: no DOM, no network.
// Loaded by tools/index.html in the browser; also require()-able from Node for testing.
(function (root) {
  "use strict";

  const TEXT_OPEN = '<script type="text/plain" id="chapter-text">';
  const TEXT_CLOSE = "</script>";
  const PLACEHOLDER = "PASTE CHAPTER HERE";
  const IMAGE_RE = /^\[image:(assets\/[^\r\n\[\]]+)\]$/;

  // ---------- chapter numbers ----------

  const CN_DIGITS = { "零": 0, "〇": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9 };
  const CN_UNITS = { "十": 10, "百": 100, "千": 1000 };

  function chapterNumber(raw) {
    const s = String(raw).replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    let total = 0;
    let digit = null;
    for (const ch of s) {
      if (ch in CN_DIGITS) {
        digit = CN_DIGITS[ch];
      } else if (ch in CN_UNITS) {
        total += (digit === null ? 1 : digit) * CN_UNITS[ch];
        digit = null;
      } else {
        return NaN;
      }
    }
    return total + (digit || 0);
  }

  function pad3(n) {
    return String(n).padStart(3, "0");
  }

  // ---------- splitting the pasted text into chapters ----------

  // A heading is a line of its own: the chapter marker with a Chinese or Arabic number, then an optional title.
  const HEADING_RE = /^第\s*([0-9０-９零〇一二两三四五六七八九十百千]+)\s*章(?:[\s:：.、·—-]*)(.*)$/;
  // A prose line that happens to start the same way is long or has sentence punctuation.
  const PROSE_MARKS = /[。，！？；“\u201d"‘\u2019…]/;

  function normalizeNewlines(text) {
    return String(text)
      .replace(/\r\n?/g, "\n")
      .replace(/[\u2028\u2029\u000b\u000c\u0085]/g, "\n");
  }

  function cleanLine(line) {
    return line.replace(/^[\s\u200b\u200c\u200d\u2060\ufeff]+|[\s\u200b\u200c\u200d\u2060\ufeff]+$/g, "");
  }

  function matchHeading(line) {
    const m = HEADING_RE.exec(line);
    if (!m) return null;
    const number = chapterNumber(m[1]);
    const title = cleanLine(m[2] || "");
    if (!Number.isFinite(number) || number < 1) return null;
    if (title.length > 30 || PROSE_MARKS.test(title)) return null;
    return { number, title };
  }

  // Returns { chapters: [{number, title, lines}], leading: "text before the first heading" }
  function splitChapters(pasted) {
    const lines = normalizeNewlines(pasted).split("\n").map(cleanLine);
    const chapters = [];
    const leading = [];
    let current = null;
    for (const line of lines) {
      const heading = line ? matchHeading(line) : null;
      if (heading) {
        current = { number: heading.number, title: heading.title, lines: [] };
        chapters.push(current);
      } else if (current) {
        current.lines.push(line);
      } else if (line) {
        leading.push(line);
      }
    }
    return { chapters, leading: leading.join("\n") };
  }

  // ---------- typography (the apostrophe rule) ----------

  // 1) every straight apostrophe becomes ’
  // 2) spaces after a closing ” are removed when Chinese narration follows,
  //    including narration that opens with a Latin name such as Georgina.
  // Nothing else is touched (commas in particular are left alone).
  const CJK = "\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff";
  const NAME = "[A-Za-z][A-Za-z0-9.\\-\\u2019]*";
  const SPACE_AFTER_QUOTE = new RegExp(
    "\\u201d[ \\t\\u00a0\\u3000]+(?=(?:" + NAME + "(?: [A-Z][A-Za-z0-9.\\-\\u2019]*)?)?[" + CJK + "])",
    "g"
  );

  function fixTypography(text) {
    return text.replace(/'/g, "\u2019").replace(SPACE_AFTER_QUOTE, "\u201d");
  }

  function toParagraphs(lines, options) {
    const fix = !options || options.fixTypography !== false;
    const out = [];
    for (const raw of lines) {
      const line = cleanLine(raw);
      if (!line) continue;
      out.push(fix ? fixTypography(line) : line);
    }
    return out;
  }

  // ---------- reading an existing chapter page ----------

  function splitStoredText(text) {
    const t = normalizeNewlines(text).trim();
    if (!t || t === PLACEHOLDER) return [];
    return t
      .split(/\n[^\S\n]*\n(?:[^\S\n]*\n)*/)
      .map((p) => p.replace(/^\s+|\s+$/g, ""))
      .filter(Boolean);
  }

  function decodeEntities(s) {
    return s
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  const H1_RE = /(<h1 class="glow-title chapter-number">)([\s\S]*?)(<\/h1>)/;
  const CW_RE = /([ \t]*)<aside class="content-warning"[^>]*>([\s\S]*?)<\/aside>[ \t]*\n?/;

  function parsePage(html) {
    const open = html.indexOf(TEXT_OPEN);
    if (open < 0) throw new Error("Couldn’t find the chapter text block in this page");
    const start = open + TEXT_OPEN.length;
    const end = html.indexOf(TEXT_CLOSE, start);
    if (end < 0) throw new Error("The chapter text block in this page has no end");
    const h1 = H1_RE.exec(html);
    const cw = CW_RE.exec(html);
    return {
      textStart: start,
      textEnd: end,
      paragraphs: splitStoredText(html.slice(start, end)),
      heading: h1 ? decodeEntities(h1[2]).replace(/\s+/g, " ").trim() : "",
      cw: cw ? decodeEntities(cw[2]).replace(/\s+/g, " ").trim() : "",
      hasCw: Boolean(cw),
    };
  }

  // ---------- illustrations ----------

  function isImage(p) {
    return IMAGE_RE.test(p);
  }

  function bigrams(s) {
    const t = s.replace(/[\s\p{P}]/gu, "");
    const out = new Map();
    for (let i = 0; i < t.length - 1; i++) {
      const g = t.slice(i, i + 2);
      out.set(g, (out.get(g) || 0) + 1);
    }
    return { map: out, size: Math.max(0, t.length - 1) };
  }

  function similarity(a, b) {
    if (a === b) return 1;
    const A = bigrams(a);
    const B = bigrams(b);
    if (!A.size || !B.size) return 0;
    let common = 0;
    for (const [g, n] of A.map) common += Math.min(n, B.map.get(g) || 0);
    return (2 * common) / (A.size + B.size);
  }

  // Put the old page's [image:...] paragraphs back into the new text, next to the
  // same paragraph they followed before. Returns { paragraphs, placed: [{src, how}] }.
  // how: "exact" | "similar" | "guess"
  function carryImages(oldParas, newParas) {
    const images = [];
    oldParas.forEach((p, i) => {
      if (!isImage(p)) return;
      let prev = null;
      for (let j = i - 1; j >= 0; j--) if (!isImage(oldParas[j])) { prev = oldParas[j]; break; }
      let next = null;
      for (let j = i + 1; j < oldParas.length; j++) if (!isImage(oldParas[j])) { next = oldParas[j]; break; }
      images.push({ src: p, prev, next, oldIndex: i });
    });
    if (!images.length || newParas.some(isImage)) return { paragraphs: newParas.slice(), placed: [] };

    const oldTextCount = oldParas.filter((p) => !isImage(p)).length || 1;
    const placements = [];
    let floor = 0; // keep images in their original order
    for (const img of images) {
      let pos = -1;
      let how = "exact";
      if (img.prev === null) {
        pos = 0;
      } else {
        const i = newParas.indexOf(img.prev, Math.max(0, floor - 1));
        if (i >= 0) pos = i + 1;
      }
      if (pos < 0 && img.next !== null) {
        const i = newParas.indexOf(img.next, floor);
        if (i >= 0) pos = i;
      }
      if (pos < 0) {
        how = "similar";
        let best = 0;
        let bestPos = -1;
        newParas.forEach((p, i) => {
          if (i + 1 < floor) return;
          const sPrev = img.prev ? similarity(img.prev, p) : 0;
          if (sPrev > best) { best = sPrev; bestPos = i + 1; }
          const sNext = img.next ? similarity(img.next, p) : 0;
          if (sNext > best && i >= floor) { best = sNext; bestPos = i; }
        });
        if (best >= 0.6) pos = bestPos;
      }
      if (pos < 0) {
        how = "guess";
        const before = oldParas.slice(0, img.oldIndex).filter((p) => !isImage(p)).length;
        pos = Math.max(floor, Math.round((before / oldTextCount) * newParas.length));
      }
      pos = Math.min(Math.max(pos, floor), newParas.length);
      floor = pos;
      placements.push({ src: img.src, pos, how });
    }
    const out = newParas.slice();
    for (let k = placements.length - 1; k >= 0; k--) out.splice(placements[k].pos, 0, placements[k].src);
    return { paragraphs: out, placed: placements.map(({ src, how }) => ({ src, how })) };
  }

  // ---------- building the new page ----------

  function headingText(number, title) {
    return title ? pad3(number) + " " + title : pad3(number);
  }

  function unsafeText(paragraphs) {
    const joined = paragraphs.join("\n");
    if (/<\/script/i.test(joined)) return "The text contains “</script”, which would cut the page off. Change it before publishing.";
    if (/<!--/.test(joined)) return "The text contains “<!--”, which can stop the page from showing in full. Change it before publishing.";
    return "";
  }

  function normalizeCw(text) {
    const t = cleanLine(String(text || "")).replace(/\s+/g, " ");
    if (!t) return "";
    return /^cw\b/i.test(t) ? t : "CW: " + t;
  }

  // Only three spots of the existing page change: the h1, the CW box, the text block.
  function buildPage(html, { number, title, paragraphs, cw }) {
    const parsed = parsePage(html);
    let out =
      html.slice(0, parsed.textStart) +
      "\n" + paragraphs.join("\n\n") + "\n\n" +
      html.slice(parsed.textEnd);

    out = out.replace(H1_RE, (_, a, __, c) => a + escapeHtml(headingText(number, title)) + c);

    const wanted = normalizeCw(cw);
    const existing = CW_RE.exec(out);
    if (existing) {
      if (!wanted) {
        out = out.slice(0, existing.index) + out.slice(existing.index + existing[0].length);
      } else if (wanted !== parsed.cw) {
        const open = existing[0].slice(existing[1].length).match(/^<aside[^>]*>/)[0];
        const replacement = existing[1] + open + "\n  " + escapeHtml(wanted) + "\n</aside>\n";
        out = out.slice(0, existing.index) + replacement + out.slice(existing.index + existing[0].length);
      }
    } else if (wanted) {
      const at = out.indexOf(TEXT_OPEN);
      const lineStart = out.lastIndexOf("\n", at) + 1;
      const box =
        '<aside class="content-warning" aria-label="Content warning">\n  ' +
        escapeHtml(wanted) +
        "\n</aside>\n";
      out = out.slice(0, lineStart) + box + out.slice(lineStart);
    }
    return out;
  }

  // ---------- works.html ----------

  const PUBLISHED_RE = /const publishedThrough = (\d+);/;

  function readPublishedThrough(worksHtml) {
    const m = PUBLISHED_RE.exec(worksHtml);
    return m ? parseInt(m[1], 10) : null;
  }

  function setPublishedThrough(worksHtml, n) {
    return worksHtml.replace(PUBLISHED_RE, "const publishedThrough = " + n + ";");
  }

  // ---------- diff ----------

  // Longest-common-subsequence diff of two arrays. Returns [{op: "=", "-", "+", value}]
  function diffArrays(a, b) {
    const n = a.length;
    const m = b.length;
    const w = m + 1;
    const table = new Uint32Array((n + 1) * (m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        table[i * w + j] = a[i] === b[j]
          ? table[(i + 1) * w + j + 1] + 1
          : Math.max(table[(i + 1) * w + j], table[i * w + j + 1]);
      }
    }
    const ops = [];
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { ops.push({ op: "=", value: a[i] }); i++; j++; }
      else if (table[(i + 1) * w + j] >= table[i * w + j + 1]) { ops.push({ op: "-", value: a[i] }); i++; }
      else { ops.push({ op: "+", value: b[j] }); j++; }
    }
    while (i < n) ops.push({ op: "-", value: a[i++] });
    while (j < m) ops.push({ op: "+", value: b[j++] });
    return ops;
  }

  // Character diff inside one edited paragraph, merged into runs.
  function diffChars(a, b) {
    const A = Array.from(a);
    const B = Array.from(b);
    if (A.length * B.length > 4e6) return [{ op: "-", value: a }, { op: "+", value: b }];
    const runs = [];
    for (const step of diffArrays(A, B)) {
      const last = runs[runs.length - 1];
      if (last && last.op === step.op) last.value += step.value;
      else runs.push({ op: step.op, value: step.value });
    }
    return runs;
  }

  // Group a paragraph diff into change blocks: [{removed: [...], added: [...], before: "context"}]
  function changeBlocks(oldParas, newParas) {
    const ops = diffArrays(oldParas, newParas);
    const blocks = [];
    let block = null;
    let lastEqual = null;
    for (const step of ops) {
      if (step.op === "=") {
        block = null;
        lastEqual = step.value;
        continue;
      }
      if (!block) {
        block = { removed: [], added: [], before: lastEqual };
        blocks.push(block);
      }
      (step.op === "-" ? block.removed : block.added).push(step.value);
    }
    return blocks;
  }

  const api = {
    PLACEHOLDER,
    chapterNumber,
    pad3,
    splitChapters,
    fixTypography,
    toParagraphs,
    parsePage,
    splitStoredText,
    isImage,
    carryImages,
    headingText,
    unsafeText,
    normalizeCw,
    buildPage,
    readPublishedThrough,
    setPublishedThrough,
    diffArrays,
    diffChars,
    changeBlocks,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PasteCore = api;
})(typeof self !== "undefined" ? self : this);
