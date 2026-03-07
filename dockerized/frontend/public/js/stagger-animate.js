(function() {
  if (typeof IntersectionObserver === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var selector = document.currentScript && document.currentScript.getAttribute('data-selector');
  if (!selector) return;
  var items = document.querySelectorAll(selector);
  items.forEach(function(el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  });
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var parent = entry.target.parentElement;
        var siblings = parent ? Array.from(parent.children).filter(function(c) { return c.style && c.style.opacity === '0'; }) : [];
        var idx = siblings.indexOf(entry.target);
        setTimeout(function() {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, Math.max(0, idx) * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  items.forEach(function(el) { observer.observe(el); });
})();
