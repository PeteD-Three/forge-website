(function () {
  "use strict";

  // Safe storage (can throw in private windows)
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // Mobile nav
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open);
    });
  }

  // Time-limited blocks hide themselves after their date
  var now = new Date(); now.setHours(0, 0, 0, 0);
  document.querySelectorAll("[data-until]").forEach(function (el) {
    var p = el.getAttribute("data-until").split("-");
    if (now > new Date(+p[0], +p[1] - 1, +p[2])) el.hidden = true;
  });

  // Announcement bar: dismiss once, remembered per event id
  var bar = document.querySelector(".announce");
  if (bar) {
    var id = bar.getAttribute("data-id");
    if (store.get("announce-" + id) === "closed") bar.hidden = true;
    var close = bar.querySelector("button");
    if (close) close.addEventListener("click", function () {
      bar.hidden = true;
      store.set("announce-" + id, "closed");
    });
  }

  // Events: render upcoming only, with an honest empty state
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function parse(d) { var p = d.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function upcoming() {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    return (window.FORGE_EVENTS || [])
      .filter(function (e) { return parse(e.date) >= today; })
      .sort(function (a, b) { return parse(a.date) - parse(b.date); });
  }
  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  var list = document.getElementById("event-list");
  if (list) {
    var limit = +list.getAttribute("data-limit") || 99;
    var items = upcoming();
    var skip = list.getAttribute("data-skip-until"); // feature card already shows this event
    if (skip) items = items.filter(function (e) { return e.date !== skip; });
    items = items.slice(0, limit);
    if (!items.length) {
      list.innerHTML = '<div class="empty"><h3>No events on the calendar right now</h3>' +
        '<p>New gatherings are added regularly. <a href="schedule.html">Ask us what\'s coming up</a>.</p></div>';
    } else {
      list.innerHTML = items.map(function (e) {
        var d = parse(e.date);
        return '<article class="event"><div class="date"><b>' + d.getDate() + '</b><span>' + MONTHS[d.getMonth()] + '</span></div>' +
          '<div><h3>' + esc(e.title) + '</h3><p class="meta">' + esc(e.time) + ' · ' + esc(e.place) + '</p>' +
          (e.blurb ? '<p class="meta">' + esc(e.blurb) + '</p>' : '') + '</div>' +
          '<a class="btn btn-dark" href="' + esc(e.url) + '">' + esc(e.cta || "Details") + '</a></article>';
      }).join("");
    }
  }

  // Group filters
  var chips = document.querySelectorAll(".chip[data-filter]");
  if (chips.length) {
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var f = chip.getAttribute("data-filter");
        chips.forEach(function (c) { c.setAttribute("aria-pressed", c === chip); });
        document.querySelectorAll(".group").forEach(function (g) {
          g.hidden = !(f === "all" || g.getAttribute("data-type") === f);
        });
      });
    });
  }

  // Donation amounts (placeholder behaviour until a giving provider is wired up)
  var amounts = document.querySelectorAll("[data-amount]");
  var amountInput = document.getElementById("amount");
  amounts.forEach(function (b) {
    b.addEventListener("click", function () { if (amountInput) amountInput.value = b.getAttribute("data-amount"); });
  });

  // Demo forms: no backend yet, so confirm locally instead of silently failing
  document.querySelectorAll("form[data-demo]").forEach(function (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var ok = document.createElement("div");
      ok.className = "form-ok"; ok.setAttribute("role", "status");
      ok.textContent = form.getAttribute("data-demo");
      form.appendChild(ok);
      form.reset();
    });
  });
})();
