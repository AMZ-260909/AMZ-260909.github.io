(() => {
  const reader = document.getElementById('reader');
  if (!reader || document.getElementById('chapter-feedback')) return;
  const key = 'chapter-feedback-v1:' + location.pathname;
  let draft = { nickname: '', closing: '', notes: [] };
  let storageOK = true;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved) {
      if (typeof saved.nickname !== 'string' || typeof saved.closing !== 'string' || !Array.isArray(saved.notes) || saved.notes.some(n => !n || typeof n.quote !== 'string' || typeof n.text !== 'string' || !Number.isInteger(n.occurrence))) throw new Error('Invalid draft');
      draft = saved;
    }
  } catch { storageOK = false; }
  const make = (tag, text, cls) => {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    if (cls) el.className = cls;
    return el;
  };
  const section = make('section', '', 'chapter-feedback');
  section.id = 'chapter-feedback';
  section.lang = 'zh-CN';
  section.append(make('h2', '给作者的小纸条'));
  section.append(make('p', '点击段落旁的 ♡ 写下感想，在这里一起发送。留言不公开，经 Formspree 转交作者邮箱。'));
  const form = make('form');
  const field = (label, tag, value, max) => {
    const wrap = make('label', label);
    const input = make(tag);
    input.value = value;
    input.maxLength = max;
    wrap.append(input);
    form.append(wrap);
    return input;
  };
  const nickname = field('昵称（选填）', 'input', draft.nickname, 80);
  const closing = field('章末感想（选填）', 'textarea', draft.closing, 10000);
  const summary = make('details');
  const summaryTitle = make('summary');
  const preview = make('pre');
  summary.append(summaryTitle, preview);
  form.append(summary);
  const actions = make('div', '', 'feedback-actions');
  const send = make('button', '发送本章留言');
  send.type = 'submit';
  const copy = make('button', '复制备份');
  copy.type = 'button';
  const download = make('button', '下载备份');
  download.type = 'button';
  actions.append(send, copy, download);
  const status = make('p');
  status.setAttribute('role', 'status');
  const storage = make('p', '', 'feedback-hint');
  form.append(actions, status, storage);
  section.append(form);
  const nav = document.querySelector('.chapter-nav');
  if (nav) nav.before(section); else reader.after(section);
  const title = document.querySelector('h1')?.textContent.trim() || document.title;
  const message = () => [title, location.href.split('#')[0], '昵称：' + (draft.nickname.trim() || '匿名读者'), ...draft.notes.filter(n => n.text.trim()).map(n => '\n原文：' + n.quote + '\n感想：' + n.text), '\n章末感想：' + draft.closing].join('\n');
  const refresh = () => {
    summaryTitle.textContent = `预览待发送内容（${draft.notes.filter(n => n.text.trim()).length} 条段落留言）`;
    preview.textContent = message();
    storage.textContent = storageOK ? '草稿仅保存在当前浏览器，发送前可复制或下载备份。' : '无法可靠保存草稿，请在离开页面前复制或下载备份。';
  };
  const save = () => {
    try { localStorage.setItem(key, JSON.stringify(draft)); storageOK = true; } catch { storageOK = false; }
    refresh();
  };
  nickname.addEventListener('input', () => { draft.nickname = nickname.value; save(); });
  closing.addEventListener('input', () => { draft.closing = closing.value; save(); });
  const editors = [];
  const occurrences = new Map();
  [...reader.children].filter(p => p.tagName === 'P').forEach((p, index) => {
    const quote = p.textContent;
    const occurrence = occurrences.get(quote) || 0;
    occurrences.set(quote, occurrence + 1);
    let note = draft.notes.find(n => n.quote === quote && n.occurrence === occurrence);
    const button = make('button', note?.text.trim() ? '♡ 1' : '♡', 'paragraph-feedback');
    button.type = 'button';
    button.setAttribute('aria-label', `给第 ${index + 1} 段写私密留言`);
    button.setAttribute('aria-expanded', 'false');
    const editor = make('div', '', 'paragraph-editor');
    editor.hidden = true;
    editor.id = 'paragraph-feedback-' + index;
    editor.lang = 'zh-CN';
    button.setAttribute('aria-controls', editor.id);
    const label = make('label', '这一段的感想（尚未发送）');
    const input = make('textarea');
    input.maxLength = 5000;
    input.value = note?.text || '';
    label.append(input);
    const done = make('button', '收起');
    done.type = 'button';
    editor.append(label, done);
    p.append(button);
    p.after(editor);
    const close = () => { editor.hidden = true; button.setAttribute('aria-expanded', 'false'); button.focus(); };
    button.addEventListener('click', () => {
      editor.hidden = !editor.hidden;
      button.setAttribute('aria-expanded', String(!editor.hidden));
      if (!editor.hidden) input.focus();
    });
    done.addEventListener('click', close);
    input.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    input.addEventListener('input', () => {
      if (!note) { note = { quote, occurrence, text: '' }; draft.notes.push(note); }
      note.text = input.value;
      button.textContent = input.value.trim() ? '♡ 1' : '♡';
      save();
    });
    editors.push({ input, button, editor });
  });
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(message()); status.textContent = '已复制，可粘贴保存。'; }
    catch { summary.open = true; status.textContent = '无法自动复制，请选中预览中的文字复制，或下载备份。'; }
  });
  download.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([message()], { type: 'text/plain;charset=utf-8' }));
    const link = make('a');
    link.href = url;
    link.download = 'chapter-' + (location.pathname.match(/chapter-(\d+)/)?.[1] || 'notes') + '-feedback.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  let sending = false;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (sending) return;
    if (!draft.closing.trim() && !draft.notes.some(n => n.text.trim())) { status.textContent = '先写一点感想再发送吧。'; return; }
    sending = true;
    const controls = [nickname, closing, send, ...editors.map(e => e.input)];
    controls.forEach(el => { el.disabled = true; });
    status.textContent = '正在发送，请稍候……';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch('https://formspree.io/f/mdekqnjd', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ subject: '小说小纸条 · ' + title, message: message() }), signal: controller.signal
      });
      if (!response.ok) throw new Error('Submission failed');
      draft.closing = '';
      draft.notes.forEach(n => { n.text = ''; });
      closing.value = '';
      editors.forEach(({ input, button, editor }) => { input.value = ''; button.textContent = '♡'; editor.hidden = true; button.setAttribute('aria-expanded', 'false'); });
      save();
      status.textContent = '留言服务已接收，谢谢你的小纸条！';
    } catch {
      status.textContent = '未能确认发送成功，草稿已保留。可稍后重试或复制备份；若刚才实际已送达，重试可能重复发送。';
    } finally {
      clearTimeout(timeout);
      sending = false;
      controls.forEach(el => { el.disabled = false; });
    }
  });
  refresh();
})();
