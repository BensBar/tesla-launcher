(function () {
  'use strict';

  // Keep in sync with the static fallback list in index.html.
  var DEFAULT_SERVICES = [
    { id: 'youtube-tv', label: 'YouTube TV', url: 'https://tv.youtube.com/' },
    { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/' },
    { id: 'netflix', label: 'Netflix', url: 'https://www.netflix.com/' },
    { id: 'espn', label: 'ESPN', url: 'https://www.espn.com/' },
    { id: 'nfl', label: 'NFL', url: 'https://www.nfl.com/' },
    { id: 'hbo-max', label: 'HBO Max', url: 'https://www.hbomax.com/' },
    { id: 'paramount-plus', label: 'Paramount+', url: 'https://www.paramountplus.com/' }
  ];

  // Intrinsic aspect ratios of logos/*.svg, so layout doesn't depend on image load timing.
  var LOGO_SIZES = { 'youtube-tv': [240, 44], 'youtube': [240, 170], 'netflix': [136, 240], 'paramount-plus': [240, 216] };

  var STORAGE_KEY = 'parked-launcher:v1';
  var MAX_SERVICES = 24;
  var MAX_LABEL = 40;
  var MODE_DIRECT = 'direct';
  var MODE_YT_REDIRECT = 'youtube-redirect';
  var YT_REDIRECT_BASE = 'https://www.youtube.com/redirect?q=';
  var YT_DIRECT_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com'];

  var storageOk = true;
  var state = { services: clone(DEFAULT_SERVICES), launchMode: MODE_DIRECT };
  var editingId = null;
  var lastRemoved = null;

  function $(id) { return document.getElementById(id); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  // ---------- Validation ----------

  // Returns { url } with a normalized href, or { error }.
  function validateUrl(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return { error: 'Enter a link.' };
    if (/\s/.test(s)) return { error: 'Links cannot contain spaces.' };

    var candidate = s;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(s)) {
      // "javascript:", "mailto:" etc. are rejected; "host:8080" gets https:// added.
      if (/^[a-z][a-z0-9+.-]*:(?!\d+(\/|$))/i.test(s)) {
        return { error: 'Only http:// and https:// links are allowed.' };
      }
      candidate = 'https://' + s;
    }

    var parsed;
    try { parsed = new URL(candidate); } catch (e) { return { error: 'That does not look like a valid link.' }; }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { error: 'Only http:// and https:// links are allowed.' };
    }
    if (parsed.username || parsed.password) {
      return { error: 'Links cannot include a username or password.' };
    }
    var host = parsed.hostname;
    if (!host || (host.indexOf('.') === -1 && host !== 'localhost')) {
      return { error: 'Enter a full address such as https://example.com/.' };
    }
    return { url: parsed.href };
  }

  function validateLabel(raw) {
    var s = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
    if (!s) return { error: 'Enter a name.' };
    if (Array.from(s).length > MAX_LABEL) return { error: 'Name must be ' + MAX_LABEL + ' characters or fewer.' };
    return { label: s };
  }

  function newId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  // ---------- Storage ----------

  function sanitizeServices(list) {
    if (!Array.isArray(list)) return null;
    var out = [];
    var seen = {};
    list.slice(0, MAX_SERVICES).forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      var l = validateLabel(item.label);
      var u = validateUrl(item.url);
      if (l.error || u.error) return;
      var id = typeof item.id === 'string' && item.id && !seen[item.id] ? item.id : newId();
      seen[id] = true;
      out.push({ id: id, label: l.label, url: u.url });
    });
    return out;
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      var services = sanitizeServices(data && data.services);
      if (services) state.services = services;
      if (data && data.launchMode === MODE_YT_REDIRECT) state.launchMode = MODE_YT_REDIRECT;
    } catch (e) {
      // Unreadable or blocked storage: keep defaults.
    }
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 1,
        services: state.services,
        launchMode: state.launchMode
      }));
      storageOk = true;
    } catch (e) {
      storageOk = false;
    }
    $('storage-warning').hidden = storageOk;
  }

  function clearStorage() {
    try { window.localStorage.removeItem(STORAGE_KEY); storageOk = true; } catch (e) { storageOk = false; }
    $('storage-warning').hidden = storageOk;
  }

  function probeStorage() {
    try {
      var k = STORAGE_KEY + ':probe';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      storageOk = true;
    } catch (e) {
      storageOk = false;
    }
    $('storage-warning').hidden = storageOk;
  }

  // ---------- Launch links ----------

  function launchHref(service) {
    if (state.launchMode !== MODE_YT_REDIRECT) return service.url;
    var host;
    try { host = new URL(service.url).hostname; } catch (e) { return service.url; }
    if (YT_DIRECT_HOSTS.indexOf(host) !== -1) return service.url;
    return YT_REDIRECT_BASE + encodeURIComponent(service.url);
  }

  function hueFor(text) {
    var h = 0;
    for (var i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 360;
    return h;
  }

  function initialsOf(label) {
    var words = label.split(' ').filter(Boolean);
    if (words.length === 1 && Array.from(words[0]).length <= 4) return words[0].toUpperCase();
    var letters = words.length > 1 ? [words[0], words[1]] : [words[0] || '?'];
    return letters.map(function (w) { return Array.from(w)[0]; }).join('').toUpperCase();
  }

  // Known services get fixed accent colors; anything else gets a hue derived from its name.
  function brandOf(url) {
    var h;
    try { h = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
    if (h === 'tv.youtube.com') return 'youtube-tv';
    if (h === 'youtube.com') return 'youtube';
    if (h === 'netflix.com') return 'netflix';
    if (h === 'paramountplus.com') return 'paramount-plus';
    if (h === 'hbomax.com' || h === 'max.com') return 'hbo-max';
    if (h === 'espn.com') return 'espn';
    if (h === 'nfl.com') return 'nfl';
    return '';
  }

  function hostOf(url) {
    try { return new URL(url).host; } catch (e) { return url; }
  }

  // ---------- Rendering ----------

  function renderTiles() {
    var ul = $('tiles');
    ul.textContent = '';
    if (!state.services.length) {
      var li = document.createElement('li');
      li.className = 'muted';
      li.textContent = 'No services yet. Open Settings to add one or reset to defaults.';
      ul.appendChild(li);
      return;
    }
    ul.classList.toggle('dense', state.services.length > 4);
    state.services.forEach(function (s) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.className = 'tile';
      a.href = launchHref(s);
      a.setAttribute('aria-label', 'Open ' + s.label);
      var brand = brandOf(s.url);
      if (brand) a.setAttribute('data-brand', brand);
      else a.style.setProperty('--hue', String(hueFor(s.label.toLowerCase())));

      var badge = document.createElement('span');
      badge.className = 'badge';
      badge.setAttribute('aria-hidden', 'true');
      if (LOGO_SIZES[brand]) {
        var img = document.createElement('img');
        img.src = 'logos/' + brand + '.svg';
        img.alt = '';
        img.width = LOGO_SIZES[brand][0];
        img.height = LOGO_SIZES[brand][1];
        badge.className = 'badge logo' + (brand === 'youtube-tv' ? ' wide' : '');
        badge.appendChild(img);
      } else {
        badge.textContent = initialsOf(s.label);
      }

      var name = document.createElement('span');
      name.className = 'name';
      name.textContent = s.label;

      var host = document.createElement('span');
      host.className = 'host';
      host.textContent = hostOf(s.url);

      a.appendChild(badge);
      a.appendChild(name);
      a.appendChild(host);
      li.appendChild(a);
      ul.appendChild(li);
    });
  }

  function renderModeNote() {
    $('mode-note').textContent = state.launchMode === MODE_YT_REDIRECT
      ? 'Launch method: experimental YouTube redirect (unverified). Switch back to direct links in Settings if it misbehaves.'
      : 'Launch method: direct links.';
    var radios = document.querySelectorAll('input[name="mode"]');
    Array.prototype.forEach.call(radios, function (r) { r.checked = r.value === state.launchMode; });
  }

  function makeBtn(text, label, onClick, disabled) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn small';
    b.textContent = text;
    b.setAttribute('aria-label', label);
    b.disabled = !!disabled;
    b.addEventListener('click', onClick);
    return b;
  }

  function renderSettingsList(focusSpec) {
    var ol = $('svc-list');
    ol.textContent = '';
    $('svc-empty').hidden = state.services.length > 0;

    state.services.forEach(function (s, i) {
      var li = document.createElement('li');
      li.className = 'svc' + (s.id === editingId ? ' editing' : '');

      var info = document.createElement('div');
      info.className = 'svc-info';
      var l = document.createElement('div');
      l.className = 'svc-label';
      l.textContent = s.label;
      var u = document.createElement('div');
      u.className = 'svc-url';
      u.textContent = s.url;
      info.appendChild(l);
      info.appendChild(u);

      var actions = document.createElement('div');
      actions.className = 'svc-actions';
      var up = makeBtn('Up', 'Move ' + s.label + ' up', function () { move(s.id, -1); }, i === 0);
      var down = makeBtn('Down', 'Move ' + s.label + ' down', function () { move(s.id, 1); }, i === state.services.length - 1);
      var edit = makeBtn('Edit', 'Edit ' + s.label, function () { startEdit(s.id); });
      var rm = makeBtn('Remove', 'Remove ' + s.label, function () { removeService(s.id); });
      up.dataset.role = 'up'; down.dataset.role = 'down'; edit.dataset.role = 'edit'; rm.dataset.role = 'remove';
      [up, down, edit, rm].forEach(function (b) { actions.appendChild(b); });

      li.dataset.id = s.id;
      li.appendChild(info);
      li.appendChild(actions);
      ol.appendChild(li);
    });

    if (focusSpec) {
      var row = ol.querySelector('li[data-id="' + cssEscape(focusSpec.id) + '"]');
      if (row) {
        var target = row.querySelector('[data-role="' + focusSpec.role + '"]:not(:disabled)') ||
          row.querySelector('button:not(:disabled)');
        if (target) target.focus();
      }
    }
  }

  function cssEscape(v) {
    return window.CSS && CSS.escape ? CSS.escape(v) : String(v).replace(/["\\]/g, '\\$&');
  }

  function renderAll(focusSpec) {
    renderTiles();
    renderSettingsList(focusSpec);
    renderModeNote();
  }

  // ---------- Dialog status ----------

  function dlgStatus(message, undoFn) {
    var el = $('dlg-status');
    el.textContent = '';
    if (!message) { el.hidden = true; return; }
    var span = document.createElement('span');
    span.textContent = message;
    el.appendChild(span);
    if (undoFn) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn small';
      b.textContent = 'Undo';
      b.addEventListener('click', undoFn);
      el.appendChild(b);
    }
    el.hidden = false;
  }

  // ---------- Actions ----------

  function move(id, delta) {
    var i = state.services.findIndex(function (s) { return s.id === id; });
    var j = i + delta;
    if (i < 0 || j < 0 || j >= state.services.length) return;
    var tmp = state.services[i];
    state.services[i] = state.services[j];
    state.services[j] = tmp;
    save();
    lastRemoved = null;
    dlgStatus('Moved ' + tmp.label + (delta < 0 ? ' up.' : ' down.'));
    renderAll({ id: id, role: delta < 0 ? 'up' : 'down' });
  }

  function removeService(id) {
    var i = state.services.findIndex(function (s) { return s.id === id; });
    if (i < 0) return;
    var removed = state.services.splice(i, 1)[0];
    lastRemoved = { service: removed, index: i };
    if (editingId === id) stopEdit();
    save();
    dlgStatus('Removed ' + removed.label + '.', undoRemove);
    renderAll();
    $('f-label').focus({ preventScroll: true });
  }

  function undoRemove() {
    if (!lastRemoved || state.services.length >= MAX_SERVICES) return;
    var r = lastRemoved;
    lastRemoved = null;
    state.services.splice(Math.min(r.index, state.services.length), 0, r.service);
    save();
    dlgStatus('Restored ' + r.service.label + '.');
    renderAll({ id: r.service.id, role: 'edit' });
  }

  function startEdit(id) {
    var s = state.services.find(function (x) { return x.id === id; });
    if (!s) return;
    editingId = id;
    $('f-label').value = s.label;
    $('f-url').value = s.url;
    $('form-title').textContent = 'Edit ' + s.label;
    $('f-submit').textContent = 'Save changes';
    $('f-cancel').hidden = false;
    setFormError('');
    renderSettingsList();
    $('f-label').focus();
  }

  function stopEdit() {
    editingId = null;
    $('svc-form').reset();
    $('form-title').textContent = 'Add a service';
    $('f-submit').textContent = 'Add service';
    $('f-cancel').hidden = true;
    setFormError('');
  }

  function setFormError(message) {
    var err = $('form-error');
    err.textContent = message;
    err.hidden = !message;
    ['f-label', 'f-url'].forEach(function (id) {
      var el = $(id);
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
    });
  }

  function failField(fieldId, message) {
    setFormError(message);
    var el = $(fieldId);
    el.setAttribute('aria-invalid', 'true');
    el.setAttribute('aria-describedby', 'form-error');
    el.focus();
  }

  function onSubmit(ev) {
    ev.preventDefault();
    var l = validateLabel($('f-label').value);
    if (l.error) return failField('f-label', l.error);
    var u = validateUrl($('f-url').value);
    if (u.error) return failField('f-url', u.error);

    if (editingId) {
      var s = state.services.find(function (x) { return x.id === editingId; });
      if (s) { s.label = l.label; s.url = u.url; }
      var savedId = editingId;
      stopEdit();
      save();
      dlgStatus('Saved ' + l.label + '.');
      renderAll({ id: savedId, role: 'edit' });
      return;
    }

    if (state.services.length >= MAX_SERVICES) {
      return failField('f-label', 'You can have up to ' + MAX_SERVICES + ' services. Remove one first.');
    }
    var added = { id: newId(), label: l.label, url: u.url };
    state.services.push(added);
    lastRemoved = null;
    stopEdit();
    save();
    dlgStatus('Added ' + added.label + '.');
    renderAll();
    $('f-label').focus();
  }

  var resetTimer = null;
  function onResetClick() {
    var btn = $('reset-btn');
    if (!btn.classList.contains('armed')) {
      btn.classList.add('armed');
      btn.textContent = 'Tap again to confirm reset';
      resetTimer = setTimeout(disarmReset, 6000);
      return;
    }
    disarmReset();
    state = { services: clone(DEFAULT_SERVICES), launchMode: MODE_DIRECT };
    lastRemoved = null;
    stopEdit();
    clearStorage();
    dlgStatus('Reset to the default services.');
    renderAll();
  }

  function disarmReset() {
    clearTimeout(resetTimer);
    var btn = $('reset-btn');
    btn.classList.remove('armed');
    btn.textContent = 'Reset to defaults';
  }

  function onModeChange(ev) {
    if (!ev.target || ev.target.name !== 'mode') return;
    state.launchMode = ev.target.value === MODE_YT_REDIRECT ? MODE_YT_REDIRECT : MODE_DIRECT;
    save();
    renderAll();
  }

  // ---------- Dialogs ----------

  function openDialog(dlg) {
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  function closeDialog(dlg) {
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
  }

  // ---------- Fullscreen ----------

  function setupFullscreen() {
    var btn = $('fs-btn');
    var root = document.documentElement;
    var supported = document.fullscreenEnabled === true && typeof root.requestFullscreen === 'function';
    if (!supported) return;
    btn.hidden = false;

    function sync() {
      var on = !!document.fullscreenElement;
      btn.textContent = on ? 'Exit fullscreen' : 'Fullscreen';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    function say(msg) {
      var el = $('status');
      el.textContent = msg;
      el.hidden = !msg;
    }

    btn.addEventListener('click', function () {
      var p;
      try {
        p = document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen();
      } catch (e) {
        p = Promise.reject(e);
      }
      Promise.resolve(p).then(function () {
        say(document.fullscreenElement
          ? 'Browser fullscreen is on. It may end when you open a service, and it is not the same as Tesla Theater fullscreen.'
          : '');
      }).catch(function () {
        say('This browser did not allow fullscreen. That is separate from Tesla Theater fullscreen; the service links still work normally.');
      });
    });

    document.addEventListener('fullscreenchange', sync);
    sync();
  }

  // ---------- Init ----------

  function init() {
    probeStorage();
    load();

    $('settings-btn').addEventListener('click', function () { openDialog($('settings')); });
    $('help-btn').addEventListener('click', function () { openDialog($('help')); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (b) {
      b.addEventListener('click', function () { closeDialog(b.closest('dialog')); });
    });
    $('settings').addEventListener('close', function () { disarmReset(); stopEdit(); dlgStatus(''); renderSettingsList(); });

    $('svc-form').addEventListener('submit', onSubmit);
    $('f-cancel').addEventListener('click', function () { stopEdit(); renderSettingsList(); });
    $('reset-btn').addEventListener('click', onResetClick);
    $('reset-btn').addEventListener('blur', disarmReset);
    document.querySelector('.modes').addEventListener('change', onModeChange);

    setupFullscreen();
    renderAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
