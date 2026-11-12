/* Коран Карим — offline Quran reader with translation */
(function () {
  'use strict';

  /* ---------------- i18n ---------------- */
  const DICT = {
    ru: {
      brand: 'Коран Карим', brandSub: 'القرآن الكريم',
      heroTitle: 'القرآن الكريم',
      heroSub: 'Читайте Коран аят за аятом с переводом',
      search: 'Поиск суры: название или номер',
      suras: 'Суры', versesShort: 'аятов',
      meccan: 'Мекканская', medinan: 'Мединская',
      resume: 'Продолжить чтение',
      settings: 'Настройки', translation: 'Перевод',
      showTr: 'Показывать перевод', lngTr: 'Язык перевода',
      font: 'Размер текста', arabic: 'Арабский текст', trSize: 'Перевод',
      theme: 'Тема', dark: 'Ночная', light: 'Дневная',
      lang: 'Язык интерфейса', russian: 'Русский', arabicLang: 'العربية',
      back: 'К списку сур', prev: 'Предыдущая', next: 'Следующая',
      surah: 'Сура', ayah: 'аят', ayahs: 'аятов',
      copy: 'Копировать', copied: 'Аят скопирован',
      share: 'Поделиться', mark: 'В закладки', unmark: 'Убрать из закладок',
      marks: 'Закладки', noMarks: 'Пока нет закладок. Нажмите ☆ у любого аята.',
      nothing: 'Ничего не найдено',
      footer: 'Коран Карим · полный текст и перевод. Работает офлайн.',
      readFrom: 'Читать с этого аята', added: 'Добавлено в закладки',
      removed: 'Убрано из закладок', trOff: 'Перевод скрыт'
    },
    ar: {
      brand: 'القرآن الكريم', brandSub: 'Коран Карим',
      heroTitle: 'القرآن الكريم',
      heroSub: 'اقرأ القرآن آية بآية مع الترجمة',
      search: 'ابحث عن سورة بالاسم أو الرقم',
      suras: 'السور', versesShort: 'آية',
      meccan: 'مكية', medinan: 'مدنية',
      resume: 'متابعة القراءة',
      settings: 'الإعدادات', translation: 'الترجمة',
      showTr: 'إظهار الترجمة', lngTr: 'لغة الترجمة',
      font: 'حجم الخط', arabic: 'النص العربي', trSize: 'الترجمة',
      theme: 'المظهر', dark: 'ليلي', light: 'نهاري',
      lang: 'لغة الواجهة', russian: 'Русский', arabicLang: 'العربية',
      back: 'إلى قائمة السور', prev: 'السورة السابقة', next: 'السورة التالية',
      surah: 'سورة', ayah: 'آية', ayahs: 'آية',
      copy: 'نسخ', copied: 'تم نسخ الآية',
      share: 'مشاركة', mark: 'حفظ', unmark: 'إزالة من المحفوظات',
      marks: 'المحفوظات', noMarks: 'لا توجد محفوظات بعد. اضغط ☆ عند أي آية.',
      nothing: 'لا نتائج',
      footer: 'القرآن الكريم · النص الكامل مع الترجمة، يعمل بدون إنترنت.',
      readFrom: 'اقرأ من هذه الآية', added: 'تمت الإضافة إلى المحفوظات',
      removed: 'تمت الإزالة من المحفوظات', trOff: 'الترجمة مخفية'
    }
  };

  const TR_LANGS = [
    { code: 'ru', label: 'Русский' },
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'de', label: 'Deutsch' },
    { code: 'es', label: 'Español' },
    { code: 'tr', label: 'Türkçe' },
    { code: 'id', label: 'Indonesia' },
    { code: 'ur', label: 'اردو', rtl: true }
  ];

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    json(k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } }
  };

  const S = {
    ui: store.get('qk_ui', 'ru'),
    tr: store.get('qk_tr', 'ru'),
    showTr: store.get('qk_showtr', '1') === '1',
    theme: store.get('qk_theme', 'dark'),
    arf: parseInt(store.get('qk_arf', '30'), 10),
    trf: parseInt(store.get('qk_trf', '16'), 10),
    surahs: [],
    ar: null,
    trCache: {},
    last: store.json('qk_last', null),
    marks: store.json('qk_marks', [])
  };

  const view = document.getElementById('view');
  const footer = document.getElementById('footer');
  const toastEl = document.getElementById('toast');
  const sheetWrap = document.getElementById('sheetWrap');
  const sheetBody = document.getElementById('sheetBody');
  const sheetTitle = document.getElementById('sheetTitle');

  let currentSurah = null;
  let saveTimer = null;

  const t = (k) => (DICT[S.ui] && DICT[S.ui][k]) || DICT.ru[k] || k;

  /* ---------------- helpers ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function stripAr(s) {
    return (s || '').replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '');
  }
  function norm(s) {
    return (s || '').toLowerCase().replace(/[ъь]/g, '').replace(/[ʼ'’`-]/g, '').replace(/\s+/g, ' ').trim();
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function applyChrome() {
    const html = document.documentElement;
    html.setAttribute('data-theme', S.theme);
    html.setAttribute('lang', S.ui);
    html.setAttribute('dir', S.ui === 'ar' ? 'rtl' : 'ltr');
    html.style.setProperty('--arf', S.arf + 'px');
    html.style.setProperty('--trf', S.trf + 'px');
    document.getElementById('brandTitle').textContent = t('brand');
    document.getElementById('brandSub').textContent = t('brandSub');
    const btnUi = document.getElementById('btnUi');
    btnUi.textContent = S.ui === 'ar' ? 'ع' : 'RU';
    document.getElementById('btnTr').classList.toggle('on', S.showTr);
    document.title = t('brand') + ' · ' + t('brandSub');
    footer.innerHTML = esc(t('footer')) + '<br><b>EASY CODE</b>';
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastEl._tm);
    toastEl._tm = setTimeout(() => { toastEl.hidden = true; }, 1900);
  }

  /* ---------------- data ---------------- */
  function getJSON(url, ms) {
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), ms || 25000) : null;
    return fetch(url, ctl ? { signal: ctl.signal } : undefined).then((r) => {
      if (timer) clearTimeout(timer);
      return r.json();
    }, (e) => { if (timer) clearTimeout(timer); throw e; });
  }

  async function loadSurahs() {
    if (!S.surahs.length) {
      const r = await fetch('data/surahs.json');
      S.surahs = await r.json();
    }
    return S.surahs;
  }
  async function loadAr() {
    if (!S.ar) S.ar = await getJSON('data/ar.json');
    return S.ar;
  }
  async function loadTr(lang) {
    if (S.trCache[lang]) return S.trCache[lang];
    const d = await getJSON('data/' + lang + '.json');
    S.trCache[lang] = d;
    return d;
  }

  function surahMeta(n) {
    return S.surahs[n - 1] || { n: n, ar: '', ru: '', verses: 0, place: 'meccan' };
  }

  /* ---------------- home ---------------- */
  async function renderHome() {
    currentSurah = null;
    applyChrome();
    await loadSurahs();
    const q = '';
    view.innerHTML = `
      <section class="hero">
        <h1>${esc(t('heroTitle'))}</h1>
        <p>${esc(t('heroSub'))}</p>
        <div class="search">
          <input id="q" type="search" inputmode="search" autocomplete="off" placeholder="${esc(t('search'))}" aria-label="${esc(t('search'))}">
          <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.7"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
        </div>
      </section>
      <div id="resumeSlot"></div>
      <div class="list-head"><h2>${esc(t('suras'))}</h2><span id="cnt">114</span></div>
      <div class="surah-list" id="list"></div>
    `;
    drawResume();
    drawList('');
    const input = document.getElementById('q');
    input.addEventListener('input', () => drawList(input.value));
    document.getElementById('list').addEventListener('click', (e) => {
      const row = e.target.closest('.srow');
      if (row) location.hash = '#/s/' + row.dataset.n;
    });
  }

  function drawResume() {
    const slot = document.getElementById('resumeSlot');
    if (!slot) return;
    if (!S.last || !S.last.n) { slot.innerHTML = ''; return; }
    const m = surahMeta(S.last.n);
    slot.innerHTML = `
      <div class="resume" id="resume" role="button" tabindex="0">
        <span class="r-ico">
          <svg viewBox="0 0 24 24" fill="none"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5Z" stroke="currentColor" stroke-width="1.6"/><path d="M8 8h7M8 11.5h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        </span>
        <span class="r-txt">
          <b>${esc(t('resume'))}: ${esc(S.ui === 'ar' ? m.ar : m.ru)}</b>
          <span>${esc(t('ayah'))} ${esc(S.last.v || 1)}</span>
        </span>
      </div>`;
    const el = document.getElementById('resume');
    const go = () => { location.hash = '#/s/' + S.last.n + '/' + (S.last.v || 1); };
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  }

  function drawList(query) {
    const list = document.getElementById('list');
    if (!list) return;
    const nq = norm(query);
    const naq = stripAr(query || '').trim();
    const items = S.surahs.filter((s) => {
      if (!nq && !naq) return true;
      if (String(s.n) === (query || '').trim()) return true;
      if (nq && (norm(s.ru).indexOf(nq) > -1 || norm(s.en).indexOf(nq) > -1)) return true;
      if (naq && stripAr(s.ar).indexOf(naq) > -1) return true;
      return false;
    });
    const cnt = document.getElementById('cnt');
    if (cnt) cnt.textContent = items.length;
    if (!items.length) { list.innerHTML = `<div class="empty">${esc(t('nothing'))}</div>`; return; }
    list.innerHTML = items.map((s) => `
      <div class="srow" data-n="${s.n}" role="button" tabindex="0">
        <span class="snum">
          <svg viewBox="0 0 40 40" fill="none"><path d="M20 2.2 35.5 10.9v18.2L20 37.8 4.5 29.1V10.9L20 2.2Z" stroke="rgba(226,195,131,.38)" stroke-width="1.2"/></svg>
          <span>${s.n}</span>
        </span>
        <span class="sname">
          <b>${esc(s.ru)}</b>
          <i>${s.verses} ${esc(t('versesShort'))} · ${esc(t(s.place))}</i>
        </span>
        <span class="sar">${esc(s.ar)}</span>
      </div>`).join('');
  }

  /* ---------------- reader ---------------- */
  async function renderSurah(n, targetVerse) {
    applyChrome();
    currentSurah = n;
    const meta = surahMeta(n);
    view.innerHTML = `<div class="empty">…</div>`;
    let ar, tr;
    try {
      await loadSurahs();
      ar = await loadAr();
      tr = await loadTr(S.tr);
    } catch (e) {
      view.innerHTML = `<div class="empty">Не удалось загрузить текст. Проверьте соединение и обновите страницу.<br><small style="opacity:.7">${'${esc(e && e.message ? e.message : e)}'}</small></div>`;
      return;
    }
    if (currentSurah !== n) return;
    const meta2 = surahMeta(n);
    const ayahs = ar[n - 1] || [];
    const trs = tr[n - 1] || [];
    const trLang = TR_LANGS.filter((l) => l.code === S.tr)[0] || TR_LANGS[0];

    const head = `
      <header class="surah-head">
        <button class="back" id="back" aria-label="${esc(t('back'))}">
          <svg viewBox="0 0 24 24" fill="none"><path d="M14.5 5.5 8 12l6.5 6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="snum-lg">${esc(meta2.ar)}</div>
        <div class="sru">${esc(meta2.ru)}</div>
        <div class="smeta">${n} · ${ayahs.length} ${esc(t('versesShort'))} · ${esc(t(meta.place))}</div>
      </header>`;

    const basmala = (n !== 1 && n !== 9) ? `<div class="basmala">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>` : '';

    const body = ayahs.map((a, i) => {
      const v = i + 1;
      const trText = trs[i] || '';
      const isMark = S.marks.indexOf(n + ':' + v) > -1;
      return `
        <article class="ayah${S.showTr ? '' : ' no-tr'}" id="v${v}" data-v="${v}">
          <div class="ayah-top">
            <span class="vnum">${v}</span>
            <div class="ayah-acts">
              <button data-act="copy" data-v="${v}" aria-label="${esc(t('copy'))}" title="${esc(t('copy'))}">
                <svg viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M15 6.5A2.5 2.5 0 0 0 12.5 4H6.5A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
              </button>
              <button data-act="share" data-v="${v}" aria-label="${esc(t('share'))}" title="${esc(t('share'))}">
                <svg viewBox="0 0 24 24" fill="none"><path d="M9 13.5 15 10M9 10.5 15 14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="17.5" cy="8" r="2.5" stroke="currentColor" stroke-width="1.6"/><circle cx="6.5" cy="12" r="2.5" stroke="currentColor" stroke-width="1.6"/><circle cx="17.5" cy="16" r="2.5" stroke="currentColor" stroke-width="1.6"/></svg>
              </button>
              <button data-act="mark" data-v="${v}" class="${isMark ? 'on' : ''}" aria-label="${esc(t('mark'))}" title="${esc(t('mark'))}" style="${isMark ? 'color:var(--gold)' : ''}">
                <svg viewBox="0 0 24 24" fill="${isMark ? 'currentColor' : 'none'}"><path d="m12 4 2.5 5.2 5.5.8-4 3.9.9 5.6-4.9-2.7-4.9 2.7.9-5.6-4-3.9 5.5-.8L12 4Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
              </button>
            </div>
          </div>
          <p class="ar">${esc(a)}</p>
          ${trText ? `<p class="tr"${trLang.rtl ? ' dir="rtl"' : ''} lang="${S.tr}">${esc(trText)}</p>` : ''}
        </article>`;
    }).join('');

    const pager = `
      <div class="pager">
        <button id="prev" ${n <= 1 ? 'disabled' : ''}>
          <svg viewBox="0 0 24 24" fill="none"><path d="M14 6.5 8.5 12 14 17.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          ${esc(t('prev'))}
        </button>
        <button id="next" ${n >= 114 ? 'disabled' : ''}>
          ${esc(t('next'))}
          <svg viewBox="0 0 24 24" fill="none"><path d="M10 6.5 15.5 12 10 17.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>`;

    view.innerHTML = head + basmala + body + pager;

    document.getElementById('back').addEventListener('click', () => { location.hash = '#/'; });
    document.getElementById('prev').addEventListener('click', () => { if (n > 1) location.hash = '#/s/' + (n - 1); });
    document.getElementById('next').addEventListener('click', () => { if (n < 114) location.hash = '#/s/' + (n + 1); });


    S.last = { n: n, v: targetVerse || 1 };
    store.set('qk_last', JSON.stringify(S.last));

    if (targetVerse) {
      const el = document.getElementById('v' + targetVerse);
      if (el) {
        setTimeout(() => {
          if (el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          el.classList.add('flash');
          setTimeout(() => el.classList.remove('flash'), 1400);
        }, 60);
      }
    } else {
      window.scrollTo({ top: 0 });
    }
  }

  function onReaderClick(e) {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const v = parseInt(btn.dataset.v, 10);
    const n = currentSurah;
    if (!n) return;
    const ayah = (S.ar[n - 1] || [])[v - 1] || '';
    const trs = (S.trCache[S.tr] || [])[n - 1] || [];
    const trText = trs[v - 1] || '';
    const act = btn.dataset.act;

    if (act === 'copy') {
      const txt = ayah + '\n\n' + trText + '\n\n(' + surahMeta(n).ar + ', ' + n + ':' + v + ')';
      navigator.clipboard && navigator.clipboard.writeText(txt).then(
        () => toast(t('copied')), () => toast(t('copied'))
      );
    } else if (act === 'share') {
      const url = location.origin + location.pathname + '#/s/' + n + '/' + v;
      const txt = ayah + '\n\n' + trText + '\n\n(' + n + ':' + v + ') ' + url;
      if (navigator.share) navigator.share({ title: surahMeta(n).ru, text: ayah + '\n\n' + trText, url: url }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(txt).then(() => toast(t('copied')));
    } else if (act === 'mark') {
      const key = n + ':' + v;
      const i = S.marks.indexOf(key);
      if (i > -1) {
        S.marks.splice(i, 1);
        btn.classList.remove('on');
        btn.style.color = '';
        btn.querySelector('path').setAttribute('fill', 'none');
        toast(t('removed'));
      } else {
        S.marks.push(key);
        btn.classList.add('on');
        btn.style.color = 'var(--gold)';
        btn.querySelector('path').setAttribute('fill', 'currentColor');
        toast(t('added'));
      }
      store.set('qk_marks', JSON.stringify(S.marks));
    }
  }

  view.addEventListener('click', onReaderClick);

  /* ---------------- reading position ---------------- */
  window.addEventListener('scroll', () => {
    if (!currentSurah || saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      const ayahs = view.querySelectorAll('.ayah');
      if (!ayahs.length) return;
      let best = 1;
      for (let i = 0; i < ayahs.length; i++) {
        const top = ayahs[i].getBoundingClientRect().top;
        if (top <= 170) best = parseInt(ayahs[i].dataset.v, 10);
        else break;
      }
      S.last = { n: currentSurah, v: best };
      store.set('qk_last', JSON.stringify(S.last));
    }, 400);
  }, { passive: true });

  /* ---------------- sheets ---------------- */
  function openSheet(kind) {
    applyChrome();
    if (kind === 'tr') {
      sheetTitle.textContent = t('translation');
      sheetBody.innerHTML = `
        <div class="opt" data-toggle="tr">
          <span>${esc(t('showTr'))}</span>
          <span class="switch ${S.showTr ? 'on' : ''}"></span>
        </div>
        <div class="opt-lbl">${esc(t('lngTr'))}</div>
        ${TR_LANGS.map((l) => `
          <div class="opt ${l.code === S.tr ? 'sel' : ''}" data-lang="${l.code}">
            <span>${esc(l.label)}${l.code === 'ru' ? '<div class="o-sub">Кулиев</div>' : ''}</span>
            ${l.code === S.tr ? '<span>✓</span>' : ''}
          </div>`).join('')}
      `;
      sheetBody.onclick = async (e) => {
        const tgl = e.target.closest('[data-toggle="tr"]');
        if (tgl) {
          S.showTr = !S.showTr;
          store.set('qk_showtr', S.showTr ? '1' : '0');
          applyChrome();
          view.querySelectorAll('.ayah').forEach((a) => a.classList.toggle('no-tr', !S.showTr));
          openSheet('tr');
          return;
        }
        const lang = e.target.closest('[data-lang]');
        if (lang) {
          S.tr = lang.dataset.lang;
          store.set('qk_tr', S.tr);
          closeSheet();
          if (currentSurah) renderSurah(currentSurah, S.last && S.last.n === currentSurah ? S.last.v : null);
          else toast(TR_LANGS.filter((l) => l.code === S.tr)[0].label);
        }
      };
    } else if (kind === 'fs') {
      sheetTitle.textContent = t('font');
      sheetBody.innerHTML = `
        <div class="opt">
          <span>${esc(t('arabic'))}</span>
          <span class="stepper"><button data-fs="arf-">−</button><span>${S.arf}</span><button data-fs="arf+">+</button></span>
        </div>
        <div class="opt">
          <span>${esc(t('trSize'))}</span>
          <span class="stepper"><button data-fs="trf-">−</button><span>${S.trf}</span><button data-fs="trf+">+</button></span>
        </div>
        <div class="opt-lbl">${esc(t('theme'))}</div>
        <div class="opt ${S.theme === 'dark' ? 'sel' : ''}" data-theme="dark"><span>${esc(t('dark'))}</span>${S.theme === 'dark' ? '<span>✓</span>' : ''}</div>
        <div class="opt ${S.theme === 'light' ? 'sel' : ''}" data-theme="light"><span>${esc(t('light'))}</span>${S.theme === 'light' ? '<span>✓</span>' : ''}</div>
      `;
      sheetBody.onclick = (e) => {
        const fs = e.target.closest('[data-fs]');
        if (fs) {
          const k = fs.dataset.fs;
          if (k === 'arf-') S.arf = Math.max(20, S.arf - 2);
          if (k === 'arf+') S.arf = Math.min(54, S.arf + 2);
          if (k === 'trf-') S.trf = Math.max(12, S.trf - 1);
          if (k === 'trf+') S.trf = Math.min(26, S.trf + 1);
          store.set('qk_arf', S.arf); store.set('qk_trf', S.trf);
          applyChrome();
          openSheet('fs');
          return;
        }
        const th = e.target.closest('[data-theme]');
        if (th) {
          S.theme = th.dataset.theme;
          store.set('qk_theme', S.theme);
          applyChrome();
          openSheet('fs');
        }
      };
    } else if (kind === 'ui') {
      sheetTitle.textContent = t('lang');
      sheetBody.innerHTML = `
        <div class="opt ${S.ui === 'ru' ? 'sel' : ''}" data-ui="ru"><span>${esc(t('russian'))}</span>${S.ui === 'ru' ? '<span>✓</span>' : ''}</div>
        <div class="opt ${S.ui === 'ar' ? 'sel' : ''}" data-ui="ar"><span>${esc(t('arabicLang'))}</span>${S.ui === 'ar' ? '<span>✓</span>' : ''}</div>
      `;
      sheetBody.onclick = (e) => {
        const b = e.target.closest('[data-ui]');
        if (!b) return;
        S.ui = b.dataset.ui;
        store.set('qk_ui', S.ui);
        closeSheet();
        route();
      };
    }
    sheetWrap.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeSheet() {
    sheetWrap.hidden = true;
    document.body.style.overflow = '';
    sheetBody.innerHTML = '';
  }

  sheetWrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheetWrap.hidden) closeSheet(); });

  /* ---------------- chrome buttons ---------------- */
  document.getElementById('btnTr').addEventListener('click', () => openSheet('tr'));
  document.getElementById('btnFs').addEventListener('click', () => openSheet('fs'));
  document.getElementById('btnUi').addEventListener('click', () => {
    S.ui = S.ui === 'ar' ? 'ru' : 'ar';
    store.set('qk_ui', S.ui);
    route();
  });
  document.getElementById('btnTheme').addEventListener('click', () => {
    S.theme = S.theme === 'dark' ? 'light' : 'dark';
    store.set('qk_theme', S.theme);
    applyChrome();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', S.theme === 'dark' ? '#07110d' : '#f5f1e6');
  });

  /* ---------------- router ---------------- */
  async function route() {
    const hash = location.hash.replace(/^#\/?/, '');
    const m = hash.match(/^s\/(\d{1,3})(?:\/(\d{1,3}))?$/);
    applyChrome();
    if (m) {
      const n = Math.min(114, Math.max(1, parseInt(m[1], 10)));
      await renderSurah(n, m[2] ? parseInt(m[2], 10) : null);
    } else {
      await renderHome();
    }
  }

  window.addEventListener('hashchange', route);

  /* ---------------- start ---------------- */
  applyChrome();
  route();

  // warm the cache in the background so the default translation works offline
  setTimeout(() => {
    loadTr(S.tr).catch(() => {});
    if (S.tr !== 'ru') loadTr('ru').catch(() => {});
  }, 1500);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
})();
