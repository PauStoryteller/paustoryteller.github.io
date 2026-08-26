(function () {
  "use strict";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Background shapes: nudge away from the cursor + highlight nearby dots ----
  var wraps = document.querySelectorAll(".bg-shape-wrap");
  if (wraps.length && !reduceMotion) {
    var PUSH_RADIUS = 240;   // px, how close the cursor needs to be to nudge a whole shape
    var MAX_PUSH = 26;       // px, how far a shape can be nudged away
    var DOT_RADIUS = 65;     // px (in the shape's own coordinate space) for the dot glow

    var mouseX = -9999, mouseY = -9999;
    var ticking = false;

    var shapes = Array.prototype.map.call(wraps, function (wrap) {
      var svg = wrap.querySelector(".bg-shape");
      var dots = svg ? Array.prototype.map.call(svg.querySelectorAll(".ht-dot"), function (c) {
        return {
          el: c,
          cx: parseFloat(c.getAttribute("cx")),
          cy: parseFloat(c.getAttribute("cy")),
          baseR: parseFloat(c.getAttribute("r")),
          baseO: parseFloat(c.getAttribute("fill-opacity") || "1")
        };
      }) : [];
      return { wrap: wrap, svg: svg, dots: dots, activeDots: [], ox: 0, oy: 0 };
    });

    function resetDots(shape) {
      for (var i = 0; i < shape.activeDots.length; i++) {
        var d = shape.activeDots[i];
        d.el.setAttribute("r", d.baseR);
        d.el.setAttribute("fill-opacity", d.baseO);
      }
      shape.activeDots = [];
    }

    function updateShape(shape) {
      var rect = shape.wrap.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var dx = cx - mouseX;
      var dy = cy - mouseY;
      var dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // whole-shape gentle push
      var tx = 0, ty = 0;
      if (dist < PUSH_RADIUS) {
        var strength = 1 - dist / PUSH_RADIUS;
        tx = (dx / dist) * MAX_PUSH * strength;
        ty = (dy / dist) * MAX_PUSH * strength;
      }
      shape.ox += (tx - shape.ox) * 0.15;
      shape.oy += (ty - shape.oy) * 0.15;
      shape.wrap.style.setProperty("--push-x", shape.ox.toFixed(1) + "px");
      shape.wrap.style.setProperty("--push-y", shape.oy.toFixed(1) + "px");

      // per-dot highlight, only if the cursor is anywhere near this shape's box
      if (shape.svg && shape.dots.length &&
          mouseX > rect.left - DOT_RADIUS && mouseX < rect.right + DOT_RADIUS &&
          mouseY > rect.top - DOT_RADIUS && mouseY < rect.bottom + DOT_RADIUS) {
        var ctm = shape.svg.getScreenCTM();
        if (ctm) {
          var pt = shape.svg.createSVGPoint();
          pt.x = mouseX; pt.y = mouseY;
          var local = pt.matrixTransform(ctm.inverse());
          var newActive = [];
          for (var j = 0; j < shape.dots.length; j++) {
            var d = shape.dots[j];
            var ddx = d.cx - local.x, ddy = d.cy - local.y;
            var ddist = Math.sqrt(ddx * ddx + ddy * ddy);
            if (ddist < DOT_RADIUS) {
              var t = 1 - ddist / DOT_RADIUS;
              d.el.setAttribute("r", (d.baseR + t * d.baseR * 1.6).toFixed(2));
              d.el.setAttribute("fill-opacity", Math.min(1, d.baseO + t * 0.55).toFixed(2));
              newActive.push(d);
            } else {
              d.el.setAttribute("r", d.baseR);
              d.el.setAttribute("fill-opacity", d.baseO);
            }
          }
          shape.activeDots = newActive;
        }
      } else if (shape.activeDots.length) {
        resetDots(shape);
      }

      return Math.abs(tx - shape.ox) > 0.05 || Math.abs(ty - shape.oy) > 0.05;
    }

    function update() {
      var settled = true;
      for (var i = 0; i < shapes.length; i++) {
        if (updateShape(shapes[i])) settled = false;
      }
      if (!settled) {
        requestAnimationFrame(update);
      } else {
        ticking = false;
      }
    }

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
