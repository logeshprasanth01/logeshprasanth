(() => {
  const CATS = window.CATEGORIES || [];
  const PROJECTS = window.PROJECTS || [];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover)').matches;
  document.getElementById('year').textContent = new Date().getFullYear();

  const fmt = (s) => { s = Math.round(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* Hero polaroid videos: pause when off screen or for reduced motion */
  document.querySelectorAll('.hero__desk video').forEach((v) => {
    if (reduce) { v.removeAttribute('autoplay'); v.pause(); return; }
    new IntersectionObserver(([e]) => { e.isIntersecting ? v.play().catch(() => {}) : v.pause(); }).observe(v);
  });

  /* Showreel */
  const film = document.querySelector('.film');
  const reel = document.getElementById('reelVideo');
  const playReel = () => {
    reel.controls = true;
    reel.play().then(() => film.classList.add('is-playing')).catch(() => {});
  };
  document.getElementById('reelPlay').addEventListener('click', playReel);
  reel.addEventListener('pause', () => { if (reel.ended) film.classList.remove('is-playing'); });
  document.querySelectorAll('[data-open-reel]').forEach((b) => b.addEventListener('click', () => {
    document.getElementById('reel').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    setTimeout(playReel, reduce ? 0 : 650);
  }));

  /* Work board */
  const board = document.getElementById('board');
  const chips = document.getElementById('chips');
  if (!canHover) document.getElementById('workNote').textContent = 'Tap a card to watch';

  const all = [{ id: 'all', name: 'All work' }, ...CATS];
  all.forEach((c, i) => {
    const n = c.id === 'all' ? PROJECTS.length : PROJECTS.filter((p) => p.cat === c.id).length;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(i === 0)); b.dataset.cat = c.id;
    b.innerHTML = `${esc(c.name)}<span class="chip__n">${n}</span>`;
    b.addEventListener('click', () => filter(c.id));
    chips.appendChild(b);
  });

  const tapes = ['tape--pink', 'tape--mint', 'tape--yellow'];
  PROJECTS.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'card'; b.dataset.cat = p.cat;
    b.style.setProperty('--r', `${[-1.6, 1.2, -0.6, 1.8, -1.1, 0.7][i % 6]}deg`);
    b.setAttribute('aria-label', `Watch ${p.title}${p.client ? ', for ' + p.client : ''}, ${fmt(p.duration)}`);
    const ratio = p.vertical ? '9 / 16' : '16 / 9';
    b.innerHTML = `
      ${i % 5 === 0 ? `<span class="tape ${tapes[i % 3]}" aria-hidden="true"></span>` : ''}
      <span class="card__media" style="aspect-ratio:${ratio}">
        <img src="${p.poster}" alt="" loading="lazy" decoding="async" width="${p.vertical ? 360 : 640}" height="${p.vertical ? 640 : 360}">
        <span class="card__dur">${fmt(p.duration)}</span>
      </span>
      <span class="card__title">${esc(p.title)}</span>
      ${p.client ? `<span class="card__client">${esc(p.client)}</span>` : ''}`;
    if (canHover && !reduce) {
      let v = null;
      b.addEventListener('mouseenter', () => {
        if (!v) {
          v = document.createElement('video');
          Object.assign(v, { src: p.preview, muted: true, loop: true, playsInline: true, preload: 'auto' });
          b.querySelector('.card__media').appendChild(v);
        }
        v.play().then(() => b.classList.add('is-previewing')).catch(() => {});
      });
      b.addEventListener('mouseleave', () => { if (v) { v.pause(); b.classList.remove('is-previewing'); } });
    }
    b.addEventListener('click', () => openViewer(p));
    board.appendChild(b);
  });

  const FIRST = 12;
  let expanded = false;
  const more = document.getElementById('more');
  const moreBtn = document.getElementById('moreBtn');
  function filter(id) {
    chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-selected', String(c.dataset.cat === id)));
    let shown = 0;
    board.querySelectorAll('.card').forEach((c) => {
      const match = id === 'all' || c.dataset.cat === id;
      c.hidden = !match || (id === 'all' && !expanded && shown >= FIRST);
      if (match) shown++;
    });
    more.hidden = !(id === 'all' && !expanded && shown > FIRST);
    moreBtn.textContent = `Show all ${shown} videos`;
  }
  moreBtn.addEventListener('click', () => { expanded = true; filter('all'); });
  filter('all');

  /* Viewer */
  const viewer = document.getElementById('viewer');
  const stage = document.getElementById('viewerStage');
  function openViewer(p) {
    reel.pause();
    stage.innerHTML = '';
    stage.classList.toggle('is-vertical', !!p.vertical);
    const v = document.createElement('video');
    Object.assign(v, { src: p.src, poster: p.poster, controls: true, playsInline: true, autoplay: true });
    stage.appendChild(v);
    document.getElementById('viewerClient').textContent = p.client || '';
    document.getElementById('viewerTitle').textContent = p.title;
    const cat = (CATS.find((c) => c.id === p.cat) || {}).name || '';
    document.getElementById('viewerFacts').textContent = [cat, fmt(p.duration)].filter(Boolean).join(', ');
    viewer.showModal();
  }
  const close = () => { stage.innerHTML = ''; viewer.close(); };
  document.getElementById('viewerClose').addEventListener('click', close);
  viewer.addEventListener('click', (e) => { if (e.target === viewer) close(); });
  viewer.addEventListener('close', () => { stage.innerHTML = ''; });

  /* Framer-style arrow cursor: eases toward the mouse, tag says what a click will do */
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const ptr = document.getElementById('pointer'), tag = document.getElementById('pointerTag');
    document.documentElement.classList.add('has-pointer');
    let tx = -100, ty = -100, x = -100, y = -100;
    addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
      const el = e.target.closest('.card, [data-open-reel], #reelPlay, a, button, input, textarea');
      let label = 'Logesh';
      if (el) {
        if (el.matches('.card')) label = 'Play video';
        else if (el.matches('[data-open-reel], #reelPlay')) label = 'Play showreel';
        else if (el.matches('input, textarea')) label = 'Type here';
        else if (el.matches('a')) label = el.getAttribute('href').startsWith('#') ? 'Go' : 'Open';
        else label = 'Click';
      }
      if (tag.textContent !== label) tag.textContent = label;
      ptr.classList.toggle('is-action', !!el);
    });
    document.addEventListener('mouseleave', () => { tx = ty = -100; });
    const k = reduce ? 1 : 0.28;
    (function loop() { x += (tx - x) * k; y += (ty - y) * k; ptr.style.transform = `translate(${x - 5}px, ${y - 4}px)`; requestAnimationFrame(loop); })();
  }

  /* Sticky-note form: compose an email */
  document.getElementById('note').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const subject = `Video project from ${f.get('name')}`;
    const body = `${f.get('msg')}\n\n${f.get('name')}\n${f.get('email')}`;
    location.href = `mailto:designlogesh@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
})();
