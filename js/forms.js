// Validation, multi-step intake, the Join a Course popup and submission for
// every form on the site. Endpoints are set in forms-config.js.
(function () {
  var cfg = window.FORGE_FORMS || { endpoints: {} };

  // ------------------------------------------------------------ helpers
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function setError(el, msg) {
    var wrap = el.closest('.field') || el.parentElement;
    var err = wrap && wrap.querySelector('.err');
    if (el.type === 'radio') {
      var grp = el.closest('fieldset');
      err = grp && grp.querySelector('.err');
    }
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
    if (el.type === 'checkbox') return !el.checked && el.required ? 'Please check this box to continue.' : '';
    if (el.required && !v) return 'This field is required.';
    if (!v) return '';
    if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Enter a valid email address.';
    if (el.type === 'tel' && v.replace(/\D/g, '').length < 7) return 'Enter a valid phone number.';
    if (el.name === 'dob_day' && !(/^\d{1,2}$/.test(v) && +v >= 1 && +v <= 31)) return 'Day: 1 to 31.';
    if (el.name === 'dob_year' && !(/^\d{4}$/.test(v) && +v >= 1900 && +v <= new Date().getFullYear())) return 'Use a 4-digit year.';
    return '';
  }

  function validateGroup(fs) {
    // A required radio group needs one choice.
    if (!fs.hasAttribute('data-required')) return true;
    var radios = $$('input[type=radio]', fs);
    if (!radios.length) return true;
    var ok = radios.some(function (r) { return r.checked; });
    setError(radios[0], ok ? '' : 'Please choose one.');
    return ok;
  }

  function validateDob(scope) {
    var m = $('[name=dob_month]', scope), d = $('[name=dob_day]', scope), y = $('[name=dob_year]', scope);
    var err = $('#in-dob-err', scope);
    if (!m || !d || !y || !m.value || !d.value || !y.value || message(d) || message(y)) { if (err) err.hidden = true; return true; }
    var dt = new Date(+y.value, +m.value - 1, +d.value);
    var valid = dt.getMonth() === +m.value - 1 && dt.getDate() === +d.value && dt <= new Date();
    if (err) { err.textContent = valid ? '' : 'Enter a real date of birth.'; err.hidden = valid; }
    return valid;
  }

  function validate(scope) {
    var first = null, ok = true;
    $$('input:not([type=radio]):not(.hp input), select, textarea', scope).forEach(function (el) {
      if (el.closest('.hp') || el.closest('[hidden]')) return;
      var msg = message(el);
      setError(el, msg);
      if (msg) { ok = false; first = first || el; }
    });
    $$('fieldset[data-group]', scope).forEach(function (fs) {
      if (fs.closest('[hidden]')) return;
      if (!validateGroup(fs)) { ok = false; first = first || $('input', fs); }
    });
    if (!validateDob(scope)) { ok = false; first = first || $('[name=dob_day]', scope); }
    if (first) first.focus();
    return ok;
  }

  // Clear an error as soon as the visitor fixes the field.
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.closest && el.closest('form[data-form]') && el.getAttribute('aria-invalid')) setError(el, message(el));
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.type === 'radio' && el.closest('form[data-form]')) setError(el, '');
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
    var box = document.createElement('div');
    box.className = 'form-success';
    box.setAttribute('role', 'status');
    box.tabIndex = -1;
    var p = document.createElement('p');
    p.textContent = text;
    box.appendChild(p);
    if (preview) {
      var note = document.createElement('p');
      note.className = 'preview-note';
      note.textContent = 'Preview only: this form is not connected yet, so nothing was sent.';
      box.appendChild(note);
    }
    if (name === 'newsletter') { form.reset(); status(form, text + (preview ? ' (Preview only: nothing was sent.)' : ''), 'ok'); return; }
    form.hidden = true;
    form.parentNode.insertBefore(box, form.nextSibling);
    box.focus();
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
        var how = (cfg.fallbackEmail ? cfg.fallbackEmail : '') + (cfg.fallbackPhone ? ' or ' + cfg.fallbackPhone : '');
        status(form, 'Sorry, something went wrong and your submission was not sent. Please try again, or reach us at ' + how + '.', 'bad');
      })
      .then(function () { if (btn && btn.dataset.label) { btn.disabled = false; btn.textContent = btn.dataset.label; } });
  }

  // ------------------------------------------------------------ wiring
  $$('form[data-form]').forEach(function (form) {
    var steps = +(form.getAttribute('data-steps') || 1);
    var current = 1;

    function show(n) {
      current = n;
      $$('.step', form).forEach(function (s) { s.hidden = +s.getAttribute('data-step') !== n; });
      var now = $('[data-step-now]', form);
      if (now) now.textContent = n;
      var target = $('.step:not([hidden]) input, .step:not([hidden]) textarea', form);
      if (target) target.focus();
      form.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    if (steps > 1) {
      $$('[data-next]', form).forEach(function (b) {
        b.addEventListener('click', function () { if (validate($('.step[data-step="' + current + '"]', form))) show(current + 1); });
      });
      $$('[data-back]', form).forEach(function (b) { b.addEventListener('click', function () { show(current - 1); }); });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (steps > 1 && current < steps) { if (validate($('.step[data-step="' + current + '"]', form))) show(current + 1); return; }
      if (!validate(form)) return;
      var trap = $('input[name=website]', form);
      if (trap && trap.value) { succeed(form, false); return; }   // bots get a fake thank-you
      send(form);
    });
  });

  // ------------------------------------------------------------ Join a Course popup
  var dialog = $('#join-course');
  if (dialog && typeof dialog.showModal === 'function') {
    $$('[data-open-dialog]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        dialog.showModal();
        var f = $('input', dialog); if (f) f.focus();
      });
    });
    $$('[data-close]', dialog).forEach(function (b) { b.addEventListener('click', function () { dialog.close(); }); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });   // click on the backdrop
    if (/[?&]popup=chcma\b/.test(location.search)) dialog.showModal();                                // same link the Wix site used
  }
})();
