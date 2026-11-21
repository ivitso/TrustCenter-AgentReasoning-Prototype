/* Prototype color picker: a small floating panel for trying out two colors live.
   - Accent: every use of the Trust Center accent green (#33c69f) on the page: the summary
     tag chips, card top borders, the MCP banner, icon circles, primary buttons, icons and
     tints. Each spot keeps its own transparency (a 10% tint stays a 10% tint).
   - AI agent: the "Ask AI Agent" button in the header (wins over the accent).
   - All Products: the product picker at the left of the header search (default #9fb4c1).
   - Agent / Your messages: the chat bubbles for the agent's replies and the visitor's messages.
   - Badges: one color per trust badge tile (blues, greens and greys by default).
   Defaults: accent #004e75, AI agent button #001b28. Set #33c69f to see the app's original green.
   Choices are saved in this browser only (localStorage). The accent is swapped in the
   elements' inline styles, and re-applied when the app re-renders or adds content. */
(function () {
  var KEY = 'prototype-color-picker';
  // The app's built-in accent is #33c69f; the prototype's chosen defaults replace it.
  var APP_ACCENT = '#33c69f';
  var DEFAULTS = { tag: '#004e75', agent: '#001b28', products: '#9fb4c1', botMsg: '#f4f7f9', userMsg: '#c5ddec' };
  var KEYS = ['tag', 'agent', 'products', 'botMsg', 'userMsg'];
  // Badge tiles: one color each, from the page's blues, greens and greys. [badge key, label, default]
  var BADGES = [
    ['soc2-type-2', 'SOC 2', '#0f3548'],
    ['iso-27001', 'ISO 27001', '#185948'],
    ['iso-42001', 'ISO 42001', '#37434b'],
    ['gdpr', 'GDPR', '#595681'],
    ['ccpa', 'CCPA', '#734a5e'],
    ['hipaa', 'HIPAA', '#5b6b75']
  ];
  BADGES.forEach(function (b) { DEFAULTS['badge:' + b[0]] = b[2]; KEYS.push('badge:' + b[0]); });
  function eff(k) { return state[k] || DEFAULTS[k]; }
  var state = load();

  function load() {
    try { return Object.assign({}, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  // Dark or light text on top of a color, whichever reads better.
  function textOn(hex) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    var l = function (c) { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    var lum = 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b);
    return lum > 0.18 ? '#162d3c' : '#ffffff';
  }

  var style = document.createElement('style');
  style.id = 'prototype-color-picker-style';
  document.head.appendChild(style);

  // --- Accent swap in inline styles -------------------------------------------------
  // The app writes the accent as rgb(51, 198, 159), rgba(51, 198, 159, a) or #33c69f.
  var ACCENT_RE = /rgba?\(\s*51\s*,\s*198\s*,\s*159\s*(?:,\s*([\d.]+%?)\s*)?\)|#33c69f\b/gi;
  var SOLID_ACCENT_BG_RE = /background(?:-color)?\s*:\s*(?:rgb\(\s*51\s*,\s*198\s*,\s*159\s*\)|rgba\(\s*51\s*,\s*198\s*,\s*159\s*,\s*1\s*\)|#33c69f)/i;
  var origStyle = new WeakMap();   // element -> its style text as the app last wrote it
  var ourStyle = new WeakMap();    // element -> the style text we wrote over it
  var touched = new Set();         // elements we have rewritten (for reset)
  var writing = false;

  function rgbOf(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255].join(', ');
  }

  function recolor(el) {
    var cur = el.getAttribute('style');
    if (cur == null) return;
    // If the app changed the style since we last wrote it, that is the new original.
    if (ourStyle.get(el) !== cur) origStyle.set(el, cur);
    var orig = origStyle.get(el);
    ACCENT_RE.lastIndex = 0;
    if (!ACCENT_RE.test(orig)) return;
    var next = orig;
    if (eff('tag') !== APP_ACCENT) {
      var rgb = rgbOf(eff('tag'));
      next = orig.replace(ACCENT_RE, function (m, a) {
        return a !== undefined ? 'rgba(' + rgb + ', ' + a + ')' : 'rgb(' + rgb + ')';
      });
      // A solid accent background (a primary button, say) came with text picked for the light
      // green; pick the text again for the new accent so it stays readable.
      if (SOLID_ACCENT_BG_RE.test(orig) && /(^|;)\s*color\s*:/.test(orig)) {
        next = next.replace(/(^|;)(\s*)color\s*:[^;]*/g, '$1$2color: ' + textOn(eff('tag')));
      }
    }
    if (next !== cur) {
      writing = true;
      el.setAttribute('style', next);
      writing = false;
    }
    ourStyle.set(el, next);
    touched.add(el);
  }

  // --- Badge tiles ---------------------------------------------------------------------
  // Each badge is an <img alt="badge key"> showing a built-in SVG tile. We keep the app's
  // original SVG per badge and redraw it with the chosen background (and readable text).
  var SVG_PREFIX = 'data:image/svg+xml;base64,';
  var badgeOrig = {};          // badge key -> original SVG text
  var ourSrc = new Set();      // srcs we generated, so they are not mistaken for originals

  function recolorBadge(img) {
    var key = img.getAttribute('alt');
    if (!key || !('badge:' + key in DEFAULTS)) return;
    var src = img.getAttribute('src') || '';
    if (src.indexOf(SVG_PREFIX) !== 0) return;
    if (!ourSrc.has(src)) badgeOrig[key] = atob(src.slice(SVG_PREFIX.length));
    var svg = badgeOrig[key];
    var m = svg && svg.match(/<rect width="120" height="120" fill="(#[0-9a-fA-F]{6})"/);
    if (!m) return;
    var bg = eff('badge:' + key);
    var out = svg.split(m[1]).join(bg).split('#ffffff').join(textOn(bg));
    var next = SVG_PREFIX + btoa(out);
    if (next === src) return;
    ourSrc.add(next);
    writing = true;
    img.setAttribute('src', next);
    writing = false;
  }

  function recolorBadges(node) {
    if (node.tagName === 'IMG') return recolorBadge(node);
    var imgs = node.querySelectorAll('img[alt]');
    for (var i = 0; i < imgs.length; i++) recolorBadge(imgs[i]);
  }

  function recolorTree(node) {
    if (!node || node.nodeType !== 1 || node.closest('#prototype-color-picker')) return;
    recolorBadges(node);
    if (node.hasAttribute('style')) recolor(node);
    var list = node.querySelectorAll('[style]');
    for (var i = 0; i < list.length; i++) {
      if (!list[i].closest('#prototype-color-picker')) recolor(list[i]);
    }
  }

  function recolorAll() {
    // Elements we touched earlier, even if their style no longer mentions the accent.
    touched.forEach(function (el) { if (el.isConnected) recolor(el); else touched.delete(el); });
    recolorTree(document.body);
  }

  new MutationObserver(function (records) {
    if (writing) return;
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.type === 'attributes') {
        if (r.attributeName === 'src') recolorBadge(r.target); else recolor(r.target);
      }
      else for (var j = 0; j < r.addedNodes.length; j++) recolorTree(r.addedNodes[j]);
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'src'] });

  function apply() {
    var css = '';
    if (eff('agent') !== APP_ACCENT) {
      css += '[data-fs-element="tc-agent-ask-conveyorai-button"]{background-color:' + eff('agent') + '!important;color:' + textOn(eff('agent')) + '!important}';
    }
    // The "All Products" segment of the header search pill, with text that stays readable on it.
    var p = eff('products'), pt = textOn(p);
    css += '[id^="tc-search"] .min-w-34{background-color:' + p + '!important}' +
      '[id^="tc-search"] .min-w-34 span{color:' + pt + '!important}' +
      '[id^="tc-search"] .min-w-34 path{stroke:' + pt + '!important}';
    // Chat bubbles: the agent's replies (left) and the visitor's messages (right, .self-end).
    var MSG = '[data-component="agent-chat-response"]';
    var bm = eff('botMsg'), um = eff('userMsg');
    css += MSG + ':not(.self-end){background-color:' + bm + '!important;color:' + textOn(bm) + '!important}' +
      MSG + '.self-end{background-color:' + um + '!important;color:' + textOn(um) + '!important}' +
      MSG + '.self-end *{color:inherit!important}';
    style.textContent = css;
    if (document.body) recolorAll();
  }

  function build() {
    var root = document.createElement('div');
    root.id = 'prototype-color-picker';
    root.innerHTML =
      '<style>' +
      '#prototype-color-picker{position:fixed;left:115px;bottom:8px;z-index:2147483000;font:13px/1.35 "Instrument Sans",system-ui,sans-serif;color:#162d3c}' +
      '#prototype-color-picker .pcp-toggle{display:flex;align-items:center;gap:6px;height:32px;padding:0 14px;border:0;border-radius:999px;background:#001b28;color:#fff;font:inherit;font-weight:500;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2)}' +
      '#prototype-color-picker .pcp-panel{position:absolute;left:0;bottom:40px;width:240px;padding:14px;border-radius:12px;background:#fff;box-shadow:0 8px 28px rgba(0,27,40,.22);border:1px solid #d6e1ea}' +
      '#prototype-color-picker .pcp-panel[hidden]{display:none}' +
      '#prototype-color-picker .pcp-panel{max-height:calc(100vh - 72px);overflow-y:auto}' +
      '#prototype-color-picker .pcp-title{font-weight:600;margin:0 0 10px}' +
      '#prototype-color-picker .pcp-sub{margin-top:14px;padding-top:12px;border-top:1px solid #d6e1ea}' +
      '#prototype-color-picker label{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px}' +
      '#prototype-color-picker .pcp-field{display:flex;align-items:center;gap:6px}' +
      '#prototype-color-picker input[type=color]{width:32px;height:28px;padding:0;border:1px solid #d6e1ea;border-radius:6px;background:none;cursor:pointer}' +
      '#prototype-color-picker input[type=text]{width:74px;height:28px;padding:0 6px;border:1px solid #d6e1ea;border-radius:6px;font:12px ui-monospace,SFMono-Regular,Menlo,monospace;color:#162d3c}' +
      '#prototype-color-picker .pcp-reset{margin-top:4px;padding:0;border:0;background:none;color:#1a7f64;font:inherit;text-decoration:underline;cursor:pointer}' +
      '</style>' +
      '<div class="pcp-panel" hidden role="dialog" aria-label="Color picker">' +
      '<p class="pcp-title">Colors</p>' +
      row('tag', 'Accent (tags &amp; highlights)') +
      row('agent', 'AI agent button') +
      row('products', 'All Products picker') +
      row('botMsg', 'Agent messages') +
      row('userMsg', 'Your messages') +
      '<p class="pcp-title pcp-sub">Badges</p>' +
      BADGES.map(function (b) { return row('badge:' + b[0], b[1]); }).join('') +
      '<button type="button" class="pcp-reset">Reset to defaults</button>' +
      '</div>' +
      '<button type="button" class="pcp-toggle" aria-expanded="false">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.42-4.03-8-9-8Zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/></svg>' +
      'Colors</button>';
    document.body.appendChild(root);
    followInspector(root);

    var panel = root.querySelector('.pcp-panel');
    var toggle = root.querySelector('.pcp-toggle');
    toggle.addEventListener('click', function () {
      panel.hidden = !panel.hidden;
      toggle.setAttribute('aria-expanded', String(!panel.hidden));
    });

    KEYS.forEach(function (k) {
      var color = root.querySelector('[data-k="' + k + '"][type=color]');
      var text = root.querySelector('[data-k="' + k + '"][type=text]');
      var set = function (v, from) {
        if (!/^#[0-9a-f]{6}$/i.test(v)) return;
        state[k] = v.toLowerCase();
        if (from !== color) color.value = state[k];
        if (from !== text) text.value = state[k];
        apply(); save();
      };
      color.addEventListener('input', function () { set(color.value, color); });
      text.addEventListener('change', function () {
        var v = text.value.trim();
        set(v.charAt(0) === '#' ? v : '#' + v, text);
      });
    });

    root.querySelector('.pcp-reset').addEventListener('click', function () {
      state = {};
      try { localStorage.removeItem(KEY); } catch (e) {}
      KEYS.forEach(function (k) {
        root.querySelector('[data-k="' + k + '"][type=color]').value = DEFAULTS[k];
        root.querySelector('[data-k="' + k + '"][type=text]').value = DEFAULTS[k];
      });
      apply();
    });
  }

  // Sit 8px to the right of the chat Inspector (bottom-left), and follow it as it opens and closes.
  function followInspector(root) {
    var box = null, ro = null, queued = false;
    var findBox = function () {
      // The Inspector is a fixed element labelled "Inspector": a pill when closed, a panel when open.
      var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      var n;
      while ((n = walk.nextNode())) {
        if (n.nodeValue.trim() !== 'Inspector' || root.contains(n)) continue;
        var el = n.parentElement;
        while (el && getComputedStyle(el).position !== 'fixed') el = el.parentElement;
        if (el) return el;
      }
      return null;
    };
    var place = function () {
      queued = false;
      if (!box || !box.isConnected) {
        box = findBox();
        if (ro) ro.disconnect();
        if (!box) return;
        ro = new ResizeObserver(schedule);
        ro.observe(box);
      }
      var r = box.getBoundingClientRect();
      root.style.left = Math.round(r.right + 8) + 'px';
      root.style.bottom = Math.round(window.innerHeight - r.bottom) + 'px';
    };
    var schedule = function () { if (!queued) { queued = true; requestAnimationFrame(place); } };
    place();
    new MutationObserver(function () { if (!box || !box.isConnected) schedule(); })
      .observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
  }

  function row(k, label) {
    var v = state[k] || DEFAULTS[k];
    return '<label><span>' + label + '</span><span class="pcp-field">' +
      '<input type="color" data-k="' + k + '" value="' + v + '" aria-label="' + label + ' color">' +
      '<input type="text" data-k="' + k + '" value="' + v + '" maxlength="7" spellcheck="false" aria-label="' + label + ' hex">' +
      '</span></label>';
  }

  apply();
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
