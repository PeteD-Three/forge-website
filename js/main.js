// Mobile menu, photo carousel, counselor filter, in-page links that open accordions.
(function () {
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.menu-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });
    document.querySelectorAll('.nav a').forEach(function (a) {
      a.addEventListener('click', function () { header.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); });
    });
  }

  document.querySelectorAll('.carousel').forEach(function (c) {
    var track = c.querySelector('.track');
    c.querySelector('.prev').addEventListener('click', function () { track.scrollBy({ left: -420, behavior: 'smooth' }); });
    c.querySelector('.next').addEventListener('click', function () { track.scrollBy({ left: 420, behavior: 'smooth' }); });
  });

  // Counselor filter by location
  var buttons = document.querySelectorAll('.filter button[data-filter]');
  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.getAttribute('data-filter');
      buttons.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      document.querySelectorAll('#bio-grid .bio').forEach(function (card) {
        card.hidden = !(f === 'all' || card.getAttribute('data-loc') === f);
      });
    });
  });

  // A link like about.html#beliefs opens the accordion it points into.
  function openTarget() {
    var el = location.hash && document.querySelector(location.hash);
    if (!el) return;
    var d = el.querySelector('details'); if (d) d.open = true;
  }
  openTarget();
  window.addEventListener('hashchange', openTarget);
})();
