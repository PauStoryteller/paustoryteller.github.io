(function () {
  "use strict";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Cursor-reactive background shapes (parallax) ----
  var wraps = document.querySelectorAll(".bg-shape-wrap");
  if (wraps.length && !reduceMotion) {
    var mx = 0, my = 0, cx = 0, cy = 0, ticking = false;

    function onMove(e) {
      var w = window.innerWidth, h = window.innerHeight;
      mx = (e.clientX / w - 0.5) * 2; // -1 .. 1
      my = (e.clientY / h - 0.5) * 2;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    function update() {
      cx += (mx - cx) * 0.06;
      cy += (my - cy) * 0.06;
      for (var i = 0; i < wraps.length; i++) {
        var depth = parseFloat(wraps[i].getAttribute("data-depth")) || 25;
        var tx = (cx * depth).toFixed(1);
        var ty = (cy * depth).toFixed(1);
        wraps[i].style.transform = "translate(" + tx + "px," + ty + "px)";
      }
      if (Math.abs(mx - cx) > 0.001 || Math.abs(my - cy) > 0.001) {
        requestAnimationFrame(update);
      } else {
        ticking = false;
      }
    }

    window.addEventListener("mousemove", onMove, { passive: true });
  }

  // ---- Scroll reveal ----
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach ? revealEls.forEach(function (el) { el.classList.add("is-visible"); })
        : Array.prototype.forEach.call(revealEls, function (el) { el.classList.add("is-visible"); });
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
