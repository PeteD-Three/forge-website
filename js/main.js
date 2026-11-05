// Mobile menu, dropdown taps, carousel arrows, placeholder form handling.
(function () {
  var header = document.querySelector('.site-header');
  var toggle = document.querySelector('.menu-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = header.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });
  }

  document.querySelectorAll('.has-dd > button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var li = btn.parentElement;
      var open = li.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.has-dd')) {
      document.querySelectorAll('.has-dd.open').forEach(function (li) { li.classList.remove('open'); });
    }
  });

  document.querySelectorAll('.carousel').forEach(function (c) {
    var track = c.querySelector('.track');
    c.querySelector('.prev').addEventListener('click', function () { track.scrollBy({ left: -420, behavior: 'smooth' }); });
    c.querySelector('.next').addEventListener('click', function () { track.scrollBy({ left: 420, behavior: 'smooth' }); });
  });

})();
