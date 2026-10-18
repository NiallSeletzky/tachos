/* TACHOS phpBB homepage adapter — styles only the same-origin embedded view.
   phpBB core, configuration, authentication, and database are NOT altered. */
(() => {
  'use strict';
  const frame = document.querySelector('#forum iframe.tachos-board__frame');
  const note = document.querySelector('#forum-embed-note');
  if (!frame || !note) return;
  const MIN_HEIGHT = 430;
  const MAX_HEIGHT = 1800;
  let observer = null;
  let queued = false;

  function resize() {
    queued = false;
    try {
      const doc = frame.contentDocument;
      if (!doc || !doc.body) return;
      const root = doc.querySelector('#wrap') || doc.body;
      // Keep a hard maximum, so a long topic never makes the home page enormous.
      const height = Math.ceil(root.getBoundingClientRect().height + 32);
      if (Number.isFinite(height) && height > 0) {
        frame.style.height = `${Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, height))}px`;
      }
    } catch (_) { /* External login destinations can be different origin. */ }
  }
  function scheduleResize() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(resize);
  }
  function showFallback() {
    frame.hidden = true;
    note.innerHTML = 'The embedded forum is unavailable. <a href="/forum/">Open the full forum</a> to browse and post.';
  }

  frame.addEventListener('load', () => {
    if (observer) { observer.disconnect(); observer = null; }
    try {
      const doc = frame.contentDocument;
      if (!doc || !doc.body || !doc.querySelector('#wrap')) {
        showFallback(); return;
      }
      frame.hidden = false;
      const existing = doc.getElementById('tachos-phpbb-home-adapter');
      if (existing) existing.remove();
      const style = doc.createElement('style');
      style.id = 'tachos-phpbb-home-adapter';
      style.textContent = `
        :root{color-scheme:light}
        html,body{background:#fffaf2!important;min-width:0!important}
        body,input,button,select,textarea{font-family:Arial,Calibri,sans-serif!important}
        #wrap{max-width:none!important;width:100%!important;min-width:0!important;
          margin:0!important;padding:12px 16px 26px!important;border:0!important;
          border-radius:0!important;box-shadow:none!important;background:#fffaf2!important}
        #page-header .headerbar,#page-footer{display:none!important}
        #page-header .navbar,.navbar{background:#f6eee1!important;border-radius:8px!important;
          border:1px solid #dfd0bd!important;box-shadow:none!important}
        #page-body{margin:0!important}
        .forabg,.forumbg{background:transparent!important;padding:0!important;
          border:1px solid #dfd0bd!important;border-radius:8px!important;overflow:hidden!important}
        .forabg .header,.forumbg .header,ul.topiclist li.header{background:#192733!important}
        ul.topiclist li.header dt,ul.topiclist li.header dd,ul.topiclist li.header a{color:#fffaf2!important}
        li.row,ul.topiclist li.row{background:#fffaf2!important;border-top:1px solid #e7d9c9!important}
        li.row:hover,ul.topiclist li.row:hover{background:#f6eee1!important}
        a.forumtitle,a.topictitle{color:#176579!important}
        a.forumtitle:hover,a.topictitle:hover,a:hover{color:#de6046!important}
        a:focus-visible,button:focus-visible{outline:3px solid #de6046!important;outline-offset:2px}
        .panel,.bg1,.bg2,.bg3{border-radius:6px!important}
        @media(max-width:640px){#wrap{padding:8px 7px 16px!important}}
      `;
      doc.head.appendChild(style);
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(scheduleResize);
        observer.observe(doc.querySelector('#wrap'));
      }
      scheduleResize();
    } catch (_) { showFallback(); }
  });
  window.addEventListener('resize', scheduleResize, {passive:true});
})();
