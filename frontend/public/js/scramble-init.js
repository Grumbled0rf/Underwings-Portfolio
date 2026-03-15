document.addEventListener('DOMContentLoaded', function() {
  gsap.registerPlugin(ScrambleTextPlugin);
  var scrambleElements = document.querySelectorAll('[data-name="scramble"]');
  scrambleElements.forEach(function(el) {
    var scrambleTL = gsap.timeline({ paused: true });
    var isPlaying = false;
    scrambleTL.to(el, {
      duration: 0.8,
      scrambleText: {
        text: "{original}",
        chars: "+?84564XERSHKZN",
        speed: 0.5
      }
    });
    el.addEventListener('mouseenter', function() {
      if (!isPlaying) {
        isPlaying = true;
        scrambleTL.restart();
      }
    });
    scrambleTL.eventCallback("onComplete", function() {
      isPlaying = false;
    });
  });
});
