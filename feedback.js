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
  section.lang = 'en';
  section.append(make('h2', 'Send the author a repo'));
  section.append(make('p', 'Click the heart beside a paragraph to write a repo, then send everything here. Your repo stays private and is delivered to the author via Formspree.'));
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
  const nickname = field('Nickname (optional)', 'input', draft.nickname, 80);
  const closing = field('Chapter repo (optional)', 'textarea', draft.closing, 10000);
  const summary = make('details');
  const summaryTitle = make('summary');
  const preview = make('pre');
  summary.append(summaryTitle, preview);
  form.append(summary);
  const actions = make('div', '', 'feedback-actions');
  const send = make('button', 'Send chapter repo');
  send.type = 'submit';
  const copy = make('button', 'Copy backup');
  copy.type = 'button';
  const download = make('button', 'Download backup');
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
  const message = () => [title, location.href.split('#')[0], 'Nickname: ' + (draft.nickname.trim() || 'Anonymous reader'), ...draft.notes.filter(n => n.text.trim()).map(n => '\nQuote: ' + n.quote + '\nrepo: ' + n.text), '\nChapter repo: ' + draft.closing].join('\n');
  const refresh = () => {
    summaryTitle.textContent = `Preview (${draft.notes.filter(n => n.text.trim()).length} paragraph entries)`;
    preview.textContent = message();
    storage.textContent = storageOK ? 'Drafts are saved only in this browser. You can copy or download a backup before sending.' : 'Draft storage is unavailable. Please copy or download a backup before leaving this page.';
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
    const button = make('button', note?.text.trim() ? '♥︎ 1' : '♥︎', 'paragraph-feedback');
    button.type = 'button';
    button.setAttribute('aria-label', `Write a private repo for paragraph ${index + 1}`);
    button.setAttribute('aria-expanded', 'false');
    const editor = make('div', '', 'paragraph-editor');
    editor.hidden = true;
    editor.id = 'paragraph-feedback-' + index;
    editor.lang = 'en';
    button.setAttribute('aria-controls', editor.id);
    const label = make('label', 'Paragraph repo (not sent yet)');
    const input = make('textarea');
    input.maxLength = 5000;
    input.value = note?.text || '';
    label.append(input);
    const done = make('button', 'Close');
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
      button.textContent = input.value.trim() ? '♥︎ 1' : '♥︎';
      save();
    });
    editors.push({ input, button, editor });
  });
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(message()); status.textContent = 'Copied! Paste it somewhere safe to keep a backup.'; }
    catch { summary.open = true; status.textContent = 'Could not copy automatically. Select and copy the preview text, or download a backup.'; }
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
    if (!draft.closing.trim() && !draft.notes.some(n => n.text.trim())) { status.textContent = 'Write a repo before sending.'; return; }
    sending = true;
    const controls = [nickname, closing, send, ...editors.map(e => e.input)];
    controls.forEach(el => { el.disabled = true; });
    status.textContent = 'Sending, please wait...';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch('https://formspree.io/f/mdekqnjd', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ subject: 'Chapter repo · ' + title, message: message() }), signal: controller.signal
      });
      if (!response.ok) throw new Error('Submission failed');
      draft.closing = '';
      draft.notes.forEach(n => { n.text = ''; });
      closing.value = '';
      editors.forEach(({ input, button, editor }) => { input.value = ''; button.textContent = '♥︎'; editor.hidden = true; button.setAttribute('aria-expanded', 'false'); });
      save();
      status.textContent = 'Your repo has been accepted by the delivery service. Thank you!';
    } catch {
      status.textContent = 'Could not confirm delivery. Your draft is still available. Try again later or copy a backup. Retrying may send a duplicate if the first attempt went through.';
    } finally {
      clearTimeout(timeout);
      sending = false;
      controls.forEach(el => { el.disabled = false; });
    }
  });
  refresh();
})();
