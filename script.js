/* =====================================================
   Dicionário de Dados - Comércio MLG
   Tema, navegação, pesquisa em tempo real e visualizador do DER
   ===================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var sections = Array.prototype.slice.call(document.querySelectorAll('section.dict-table'));

  /* ---------- Tema claro / escuro ---------- */
  var themeToggle = document.getElementById('themeToggle');
  var themeLabel = document.getElementById('themeLabel');

  function applyThemeLabel() {
    var dark = root.getAttribute('data-theme') === 'dark';
    themeLabel.textContent = dark ? 'Modo claro' : 'Modo escuro';
    themeToggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
  }

  themeToggle.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('mlg-dd-theme', next); } catch (e) { /* armazenamento indisponível */ }
    applyThemeLabel();
  });
  applyThemeLabel();

  /* ---------- Sidebar gerada a partir das tabelas ---------- */
  var nav = document.getElementById('tableNav');
  var navCount = document.getElementById('navCount');
  var navLinks = {};

  sections.forEach(function (sec) {
    var a = document.createElement('a');
    a.href = '#' + sec.id;
    a.textContent = sec.getAttribute('data-table');
    a.title = sec.getAttribute('data-title');
    nav.appendChild(a);
    navLinks[sec.id] = a;
  });
  navCount.textContent = '(' + sections.length + ')';

  /* ---------- Menu móvel ---------- */
  var sidebar = document.getElementById('sidebar');
  var backdrop = document.getElementById('backdrop');
  var menuBtn = document.getElementById('menuBtn');

  function setMenu(open) {
    sidebar.classList.toggle('open', open);
    backdrop.classList.toggle('show', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  menuBtn.addEventListener('click', function () { setMenu(!sidebar.classList.contains('open')); });
  backdrop.addEventListener('click', function () { setMenu(false); });
  sidebar.addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });

  /* ---------- Destaque da tabela visível ---------- */
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          Object.keys(navLinks).forEach(function (id) { navLinks[id].classList.remove('active'); });
          var link = navLinks[entry.target.id];
          if (link) link.classList.add('active');
        }
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    sections.forEach(function (sec) { observer.observe(sec); });
  }

  /* ---------- Pesquisa em tempo real ---------- */
  var input = document.getElementById('searchInput');
  var info = document.getElementById('searchInfo');
  var emptyState = document.getElementById('emptyState');

  function normalize(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function clearMarks(el) {
    var marks = el.querySelectorAll('mark');
    Array.prototype.forEach.call(marks, function (m) {
      m.replaceWith(document.createTextNode(m.textContent));
    });
    el.normalize();
  }

  function markText(el, term) {
    var text = el.textContent;
    var idx = normalize(text).indexOf(term);
    if (idx < 0 || !term) return;
    el.textContent = '';
    el.appendChild(document.createTextNode(text.slice(0, idx)));
    var m = document.createElement('mark');
    m.textContent = text.slice(idx, idx + term.length);
    el.appendChild(m);
    el.appendChild(document.createTextNode(text.slice(idx + term.length)));
  }

  function filter() {
    var term = normalize(input.value.trim());
    var visibleTables = 0;
    var visibleRows = 0;

    sections.forEach(function (sec) {
      var tableName = normalize(sec.getAttribute('data-table') + ' ' + sec.getAttribute('data-title'));
      var tableMatch = term === '' || tableName.indexOf(term) !== -1;
      var rows = sec.querySelectorAll('tbody tr');
      var rowsShown = 0;

      Array.prototype.forEach.call(rows, function (tr) {
        var attrEl = tr.querySelector('.attr');
        clearMarks(attrEl);
        var colMatch = term !== '' && normalize(tr.getAttribute('data-col')).indexOf(term) !== -1;
        var show = tableMatch || colMatch;
        tr.hidden = !show;
        if (show) rowsShown++;
        if (colMatch) markText(attrEl, term);
      });

      var showSection = rowsShown > 0;
      sec.hidden = !showSection;
      if (navLinks[sec.id]) navLinks[sec.id].classList.toggle('is-hidden', !showSection);
      if (showSection) { visibleTables++; visibleRows += rowsShown; }
    });

    emptyState.hidden = visibleTables > 0;
    info.textContent = term === ''
      ? ''
      : visibleTables + ' tabela(s), ' + visibleRows + ' atributo(s)';
  }

  input.addEventListener('input', filter);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { input.value = ''; filter(); }
  });

  /* ---------- Modal do DER com zoom e arraste ---------- */
  var modal = document.getElementById('derModal');
  var stage = document.getElementById('derStage');
  var img = document.getElementById('derImage');
  var missing = document.getElementById('derMissing');
  var openBtn = document.getElementById('openDer');
  var closeBtn = document.getElementById('closeDer');
  var panzoom = null;
  var lastFocus = null;

  img.addEventListener('error', function () {
    img.hidden = true;
    missing.hidden = false;
  });

  function initPanzoom() {
    if (panzoom || typeof window.Panzoom !== 'function') return;
    panzoom = window.Panzoom(img, { maxScale: 8, minScale: 0.3, step: 0.3, canvas: true });
    stage.addEventListener('wheel', function (e) {
      e.preventDefault();
      panzoom.zoomWithWheel(e);
    }, { passive: false });
  }

  function openModal() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    initPanzoom();
    if (panzoom) panzoom.reset({ animate: false });
    closeBtn.focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (lastFocus) lastFocus.focus();
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  document.getElementById('zoomIn').addEventListener('click', function () { if (panzoom) panzoom.zoomIn(); });
  document.getElementById('zoomOut').addEventListener('click', function () { if (panzoom) panzoom.zoomOut(); });
  document.getElementById('zoomReset').addEventListener('click', function () { if (panzoom) panzoom.reset(); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });
})();
