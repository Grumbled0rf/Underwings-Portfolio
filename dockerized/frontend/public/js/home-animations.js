(function() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var section = document.getElementById('testimonials');
  if (!section || !('IntersectionObserver' in window)) {
    if (section) section.querySelectorAll('.vertical-heading-top, .testimonial-card').forEach(function(el) { el.classList.add('is-animated'); });
    return;
  }
  var targets = section.querySelectorAll('.vertical-heading-top, .testimonial-card');
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        var idx = Array.prototype.indexOf.call(targets, entry.target);
        setTimeout(function() {
          entry.target.classList.add('is-animated');
        }, idx * 150);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(function(el) { observer.observe(el); });

  // How It Works staggered entrance
  var hiwSection = document.getElementById('how-it-works');
  if (hiwSection) {
    var hiwSteps = hiwSection.querySelectorAll('.hiw-step');
    var hiwObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var idx = Array.prototype.indexOf.call(hiwSteps, entry.target);
          setTimeout(function() {
            entry.target.classList.add('is-animated');
          }, idx * 150);
          hiwObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    hiwSteps.forEach(function(el) { hiwObserver.observe(el); });
  }
})();
