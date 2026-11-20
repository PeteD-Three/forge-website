// Step-by-step forms (click a tile, move on), validation, and submission.
// Endpoints are set in forms-config.js; with none set, forms run in preview mode.
(function () {
  var cfg = window.FORGE_FORMS || { endpoints: {} };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // ------------------------------------------------------------ validation
  function setError(el, msg) {
    var wrap = el.closest('.field');
    var err = wrap && $('.err', wrap);
    if (msg) {
      el.setAttribute('aria-invalid', 'true');
      if (err) { err.textContent = msg; err.hidden = false; el.setAttribute('aria-describedby', err.id); }
    } else {
      el.removeAttribute('aria-invalid');
      if (err) { err.textContent = ''; err.hidden = true; el.removeAttribute('aria-describedby'); }
    }
  }

  function message(el) {
    var v = (el.value || '').trim();
    if (el.type === 'checkbox') return el.required && !el.checked ? 'Please check this box to continue.' : '';
    if (el.required && !v) return 'This field is required.';
    if (!v) return '';
    if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter a valid email address.';
    if (el.type === 'tel' && v.replace(/\D/g, '').length < 7) return 'Enter a valid phone number.';
    return '';
  }

  // Check the typed fields inside a step (or whole form). Returns true when fine.
  function validateFields(scope) {
    var first = null;
    $$('input:not([type=radio]):not([type=hidden]), textarea', scope).forEach(function (el) {
      if (el.closest('.hp') || el.closest('[hidden]') || el.closest('.tiles')) return;
      var msg = message(el);
      setError(el, msg);
      if (msg && !first) first = el;
    });
    if (first) first.focus();
    return !first;
  }

  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.closest && el.closest('form[data-form]') && el.getAttribute('aria-invalid')) setError(el, message(el));
  });

  // ------------------------------------------------------------ submission
  function status(form, text, kind) {
    var box = $('.form-status', form);
    if (!box) return;
    box.textContent = text;
    box.className = 'form-status ' + (kind || '');
    box.hidden = !text;
  }

  function succeed(form, preview) {
    var name = form.getAttribute('data-form');
    var text = form.getAttribute('data-success') || 'Thank you!';
    if (name === 'newsletter') { form.reset(); status(form, text + (preview ? ' (Preview only: nothing was sent.)' : ''), 'ok'); return; }
    var box = document.createElement('div');
    box.className = 'form-success';
    box.setAttribute('role', 'status');
    box.tabIndex = -1;
    box.innerHTML = '<h3>Thank you</h3>';
    var p = document.createElement('p');
    p.textContent = text;
    box.appendChild(p);
    if (preview) {
      var note = document.createElement('p');
      note.className = 'preview-note';
      note.textContent = 'Preview only: this form is not connected yet, so nothing was sent.';
      box.appendChild(note);
    }
    form.hidden = true;
    form.parentNode.insertBefore(box, form.nextSibling);
    box.focus();
    box.scrollIntoView({ block: 'center' });
  }

  function send(form) {
    var name = form.getAttribute('data-form');
    var endpoint = (cfg.endpoints || {})[name];
    var data = new FormData(form);
    data.delete('website');
    data.append('_form', name);
    data.append('_page', location.pathname.split('/').pop() || 'index.html');

    if (!endpoint) {              // preview mode
      try { console.info('[forge forms] preview submit:', name, Object.fromEntries(data)); } catch (e) {}
      succeed(form, true);
      return;
    }

    var btn = $('button[type=submit]', form);
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Sending…'; }
    status(form, '', '');
    fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (res) { if (!res.ok) throw new Error(res.status); succeed(form, false); })
      .catch(function () {
        var how = (cfg.fallbackEmail || '') + (cfg.fallbackPhone ? ' or ' + cfg.fallbackPhone : '');
        status(form, 'Sorry, something went wrong and your submission was not sent. Please try again, or reach us at ' + how + '.', 'bad');
      })
      .then(function () { if (btn && btn.dataset.label) { btn.disabled = false; btn.textContent = btn.dataset.label; } });
  }

  // ------------------------------------------------------------ step-by-step forms
  function wizard(form) {
    var steps = $$('.wstep', form);
    var rail = $$('.wizard-rail li', form);
    var bar = $('.wbar span', form);
    var now = $('[data-now]', form);
    var current = 0;

    function chosen(step) { return $$('.tiles input:checked', step); }
    function value(name) { var c = $('input[name="' + name + '"]:checked', form); return c ? c.value : ''; }

    function applyFilter(step) {
      // Narrow counselor tiles to the location chosen earlier (Online shows everyone).
      var loc = value('location');
      var key = loc === 'Kansas City' ? 'kc' : loc === 'Tulsa' ? 'tulsa' : '';
      $$('.tile[data-loc]', step).forEach(function (t) {
        var show = !key || t.getAttribute('data-loc') === key;
        t.hidden = !show;
        var input = $('input', t);
        if (!show && input.checked) { input.checked = false; $('input[value="No preference"]', step).checked = true; }
      });
    }

    function summary(step) {
      var dl = $('[data-summary]', step);
      dl.innerHTML = '';
      steps.slice(0, -1).forEach(function (s) {
        // Walk tile groups and text fields in page order. A step that asks several
        // things labels each answer with its question.
        var parts = [];
        var items = $$('.tiles, .field', s);
        items.forEach(function (el) {
          var val = '', label = '';
          if (el.classList.contains('tiles')) {
            val = $$('input:checked', el).map(function (i) { var t = i.closest('.tile'); return (t.querySelector('strong') || t.querySelector('span')).textContent.trim(); }).join(', ');
            var h = el.previousElementSibling;
            if (h && h.classList.contains('sub')) label = h.textContent.replace(/\(optional\)/i, '').trim();
          } else {
            if (el.classList.contains('check')) return;
            var f = $('input:not([type=checkbox]):not([type=radio]), textarea', el);
            if (!f || f.closest('.hp') || !f.value.trim()) return;
            val = f.value.trim();
            var l = $('label', el);
            if (l) label = l.textContent.replace(/\(optional\)|\*/gi, '').trim();
          }
          if (val) parts.push({ label: label, val: val });
        });
        var row = document.createElement('div');
        var dt = document.createElement('dt'); dt.textContent = s.getAttribute('data-title');
        var dd = document.createElement('dd');
        if (!parts.length) dd.textContent = 'Not shared';
        parts.forEach(function (p) {
          var line = document.createElement('div');
          line.textContent = items.length > 1 && p.label ? p.label.replace(/[?:]$/, '') + ': ' + p.val : p.val;
          dd.appendChild(line);
        });
        row.appendChild(dt); row.appendChild(dd); dl.appendChild(row);
      });
    }

    function show(n, focus) {
      current = n;
      steps.forEach(function (s, i) { s.hidden = i !== n; });
      rail.forEach(function (li, i) {
        li.classList.toggle('is-current', i === n);
        li.classList.toggle('is-done', i < n);
      });
      if (bar) bar.style.width = Math.round(((n + 1) / steps.length) * 100) + '%';
      if (now) now.textContent = n + 1;
      var step = steps[n];
      if (step.hasAttribute('data-filter')) applyFilter(step);
      if (step.hasAttribute('data-review')) summary(step);
      if (focus !== false) {
        var h = $('h2', step); if (h) h.focus({ preventScroll: true });
        var top = form.getBoundingClientRect().top;
        if (top < 0 || top > window.innerHeight * 0.5) form.scrollIntoView({ block: 'start' });
      }
    }

    function next() {
      var step = steps[current];
      var err = $('.step-err', step);
      var needsChoice = $('.tiles', step) && !step.hasAttribute('data-optional') && !$('.field', step);
      if (needsChoice) {
        // Every tile group on a required step needs an answer, except groups marked optional by their heading.
        var groups = $$('.tiles', step).filter(function (g) { var h = g.previousElementSibling; return !(h && /optional/i.test(h.textContent)); });
        var missing = groups.some(function (g) { return !$('input:checked', g); });
        if (missing) { err.textContent = 'Please choose an option to continue.'; err.hidden = false; return; }
      }
      err.hidden = true;
      if (!validateFields(step)) return;
      show(current + 1);
    }

    // Pressing Enter on an early step goes to the next step instead of sending.
    form.addEventListener('submit', function (e) {
      if (current < steps.length - 1) { e.preventDefault(); e.stopImmediatePropagation(); next(); }
    });

    $$('[data-next]', form).forEach(function (b) { b.addEventListener('click', next); });
    $$('[data-back]', form).forEach(function (b) { b.addEventListener('click', function () { show(Math.max(0, current - 1)); }); });

    // Single-choice steps move on by themselves after a tap.
    form.addEventListener('change', function (e) {
      var input = e.target;
      var step = input.closest('.wstep');
      if (!step) return;
      var err = $('.step-err', step); if (err) err.hidden = true;
      if (input.type === 'radio' && step.hasAttribute('data-auto') && $$('.tiles', step).length === 1) {
        setTimeout(function () { if (steps[current] === step) next(); }, 220);
      }
    });

    show(0, false);
  }

  // ------------------------------------------------------------ wiring
  $$('form[data-form]').forEach(function (form) {
    if (form.hasAttribute('data-wizard')) wizard(form);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validateFields(form)) return;
      var trap = $('input[name=website]', form);
      if (trap && trap.value) { succeed(form, false); return; }   // bots get a fake thank-you
      send(form);
    });
  });
})();
