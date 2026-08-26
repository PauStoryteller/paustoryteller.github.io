(function () {
  "use strict";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Background shapes: nudge away from the cursor when it gets close ----
  var wraps = document.querySelectorAll(".bg-shape-wrap");
  if (wraps.length && !reduceMotion) {
    var RADIUS = 240;   // px, how close the cursor needs to be to affect a shape
    var MAX_PUSH = 30;  // px, how far a shape can be nudged away
    var mouseX = -9999, mouseY = -9999;
    var ticking = false;
    var shapes = Array.prototype.map.call(wraps, function (el) {
      return { el: el, ox: 0, oy: 0 };
    });

    function onMove(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    function onLeave() {
      mouseX = -9999;
      mouseY = -9999;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    function update() {
      var settled = true;
      for (var i = 0; i < shapes.length; i++) {
        var s = shapes[i];
        var rect = s.el.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var dx = cx - mouseX;
        var dy = cy - mouseY;
        var dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var tx = 0, ty = 0;
        if (dist < RADIUS) {
          var strength = 1 - dist / RADIUS;
          tx = (dx / dist) * MAX_PUSH * strength;
          ty = (dy / dist) * MAX_PUSH * strength;
        }
        s.ox += (tx - s.ox) * 0.15;
        s.oy += (ty - s.oy) * 0.15;
        s.el.style.setProperty("--push-x", s.ox.toFixed(1) + "px");
        s.el.style.setProperty("--push-y", s.oy.toFixed(1) + "px");
        if (Math.abs(tx - s.ox) > 0.05 || Math.abs(ty - s.oy) > 0.05) settled = false;
      }
      if (!settled) {
        requestAnimationFrame(update);
      } else {
        ticking = false;
      }
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave, { passive: true });
  }

  // ---- Scroll reveal ----
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(revealEls, function (el) { el.classList.add("is-visible"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
      Array.prototype.forEach.call(revealEls, function (el) { io.observe(el); });
    }
  }
})();
