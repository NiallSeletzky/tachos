/* Rotate only the visible heading, retaining one semantic heading for accessibility. */
(() => {
  'use strict';
  const heading = document.getElementById('rotating-headline');
  if (!heading) return;
  const messages = [
    { text: 'Data Centers with TACHOTUDE', lang: 'en' },
    { text: '与 TACHOTUDE 共建数据中心', lang: 'zh-Hans' },
    { text: 'Centros de datos con TACHOTUDE', lang: 'es' }
  ];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let interval = null;
  let transitionTimeout = null;
  function show(i) {
    current = i;
    heading.textContent = messages[i].text;
    heading.lang = messages[i].lang;
    heading.classList.remove('is-fading');
  }
  function stop() {
    if (interval !== null) clearInterval(interval);
    if (transitionTimeout !== null) clearTimeout(transitionTimeout);
    interval = null;
    transitionTimeout = null;
    heading.classList.remove('is-fading');
  }
  function start() {
    stop();
    show(0);
    if (reduced.matches) return;
    interval = setInterval(() => {
      if (document.hidden) return;
      heading.classList.add('is-fading');
      transitionTimeout = setTimeout(() => {
        show((current + 1) % messages.length);
        transitionTimeout = null;
      }, 280);
    }, 10000);
  }
  start();
  if (typeof reduced.addEventListener === 'function') reduced.addEventListener('change', start);
  window.addEventListener('pagehide', stop);
})();
