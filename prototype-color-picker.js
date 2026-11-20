/* Prototype color picker: a small floating panel for trying out two colors live.
   - Accent: every use of the Trust Center accent green (#33c69f) on the page: the summary
     tag chips, card top borders, the MCP banner, icon circles, primary buttons, icons and
     tints. Each spot keeps its own transparency (a 10% tint stays a 10% tint).
   - AI agent: the "Ask AI Agent" button in the header (wins over the accent).
   Choices are saved in this browser only (localStorage). The accent is swapped in the
   elements' inline styles, and re-applied when the app re-renders or adds content. */
(function () {
  var KEY = 'prototype-color-picker';
  var DEFAULTS = { tag: '#33c69f', agent: '#33c69f' };
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
    if (state.tag) {
      var rgb = rgbOf(state.tag);
      next = orig.replace(ACCENT_RE, function (m, a) {
        return a !== undefined ? 'rgba(' + rgb + ', ' + a + ')' : 'rgb(' + rgb + ')';
      });
    }
    if (next !== cur) {
      writing = true;
      el.setAttribute('style', next);
      writing = false;
    }
    ourStyle.set(el, next);
    touched.add(el);
  }

  function recolorTree(node) {
    if (!node || node.nodeType !== 1 || node.closest('#prototype-color-picker')) return;
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
      if (r.type === 'attributes') recolor(r.target);
      else for (var j = 0; j < r.addedNodes.length; j++) recolorTree(r.addedNodes[j]);
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });

  function apply() {
    var css = '';
    if (state.agent) {
      css += '[data-fs-element="tc-agent-ask-conveyorai-button"]{background-color:' + state.agent + '!important;color:' + textOn(state.agent) + '!important}';
    }
    style.textContent = css;
    if (document.body) recolorAll();
  }

  function build() {
    var root = document.createElement('div');
    root.id = 'prototype-color-picker';
    root.innerHTML =
      '<style>' +
      '#prototype-color-picker{position:fixed;right:16px;bottom:16px;z-index:2147483000;font:13px/1.35 "Instrument Sans",system-ui,sans-serif;color:#162d3c}' +
      '#prototype-color-picker .pcp-toggle{display:flex;align-items:center;gap:6px;height:36px;padding:0 14px;border:0;border-radius:999px;background:#001b28;color:#fff;font:inherit;font-weight:500;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.2)}' +
      '#prototype-color-picker .pcp-panel{position:absolute;right:0;bottom:44px;width:240px;padding:14px;border-radius:12px;background:#fff;box-shadow:0 8px 28px rgba(0,27,40,.22);border:1px solid #d6e1ea}' +
      '#prototype-color-picker .pcp-panel[hidden]{display:none}' +
      '#prototype-color-picker .pcp-title{font-weight:600;margin:0 0 10px}' +
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
      '<button type="button" class="pcp-reset">Reset to defaults</button>' +
      '</div>' +
      '<button type="button" class="pcp-toggle" aria-expanded="false">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.42-4.03-8-9-8Zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"/></svg>' +
      'Colors</button>';
    document.body.appendChild(root);

    var panel = root.querySelector('.pcp-panel');
    var toggle = root.querySelector('.pcp-toggle');
    toggle.addEventListener('click', function () {
      panel.hidden = !panel.hidden;
      toggle.setAttribute('aria-expanded', String(!panel.hidden));
    });

    ['tag', 'agent'].forEach(function (k) {
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
      ['tag', 'agent'].forEach(function (k) {
        root.querySelector('[data-k="' + k + '"][type=color]').value = DEFAULTS[k];
        root.querySelector('[data-k="' + k + '"][type=text]').value = DEFAULTS[k];
      });
      apply();
    });
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
