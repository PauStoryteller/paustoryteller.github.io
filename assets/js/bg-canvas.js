(function () {
  "use strict";
  var canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx = canvas.getContext("2d");

  var PRIMARY = [229, 72, 77];   // $primary red
  var SECONDARY = [157, 127, 234]; // $secondary purple

  var SPACING = 16;      // px between dots in the grid
  var HOVER_RADIUS = 150; // "flashlight" reach around the cursor
  var RIPPLE_SPEED = 0.45; // px per ms
  var RIPPLE_WIDTH = 100;
  var RIPPLE_LIFE = 1300; // ms

  var W = 0, H = 0, DPR = 1;
  var points = [];
  var mouseX = -9999, mouseY = -9999;
  var hasMouse = false;
  var ripples = [];
  var rafId = null;
  var resizeTimer = null;

  function lerpColor(a, b, t) {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    ];
  }

  function baseValue(x, y) {
    // flowing diagonal bands (static pattern, like a printed halftone)
    var proj = x * 0.55 + y * 0.83;
    var band = 0.5 + 0.5 * Math.sin(proj * 0.018);
    // ink concentrations in two corners
    var blob1 = Math.max(0, 1 - Math.hypot(x - W * 0.06, y - H * 0.95) / (H * 0.55));
    var blob2 = Math.max(0, 1 - Math.hypot(x - W * 0.97, y - H * 0.04) / (H * 0.45));
    var v = Math.max(band * 0.32, Math.pow(blob1, 1.5), Math.pow(blob2, 1.5) * 0.85);
    return Math.min(v, 1);
  }

  function buildGrid() {
    points = [];
    var cols = Math.ceil(W / SPACING) + 1;
    var rows = Math.ceil(H / SPACING) + 1;
    for (var j = 0; j < rows; j++) {
      var offset = (j % 2) * (SPACING / 2);
      for (var i = 0; i < cols; i++) {
        var x = i * SPACING + offset;
        var y = j * SPACING;
        var base = baseValue(x, y);
        if (base < 0.03) continue; // skip empty negative space, keeps the draw loop cheap
        var colorT = Math.min(1, Math.max(0, (x + y * 0.4) / (W + H * 0.4)));
        points.push({
          x: x,
          y: y,
          base: base,
          color: lerpColor(PRIMARY, SECONDARY, colorT)
        });
      }
    }
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildGrid();
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);

    // prune finished ripples
    if (ripples.length) {
      ripples = ripples.filter(function (r) { return now - r.start < RIPPLE_LIFE; });
    }

    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      var val = p.base * 0.9;

      if (hasMouse) {
        var dx = p.x - mouseX, dy = p.y - mouseY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < HOVER_RADIUS) {
          val = Math.max(val, (1 - dist / HOVER_RADIUS) * 0.95);
        }
      }

      for (var r = 0; r < ripples.length; r++) {
        var rp = ripples[r];
        var age = now - rp.start;
        var radius = age * RIPPLE_SPEED;
        var d2 = Math.hypot(p.x - rp.x, p.y - rp.y);
        var diff = Math.abs(d2 - radius);
        if (diff < RIPPLE_WIDTH) {
          var strength = (1 - diff / RIPPLE_WIDTH) * (1 - age / RIPPLE_LIFE);
          val = Math.max(val, strength);
        }
      }

      if (val < 0.04) continue;
      var radius3 = 0.5 + 2.6 * val;
      var alpha = 0.12 + 0.6 * val;
      var c = p.color;
      ctx.beginPath();
      ctx.fillStyle = "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + alpha.toFixed(2) + ")";
      ctx.arc(p.x, p.y, radius3, 0, 6.2832);
      ctx.fill();
    }

    if (!reduceMotion && (hasMouse || ripples.length)) {
      rafId = requestAnimationFrame(draw);
    } else {
      rafId = null;
      if (reduceMotion) return; // static frame is enough
    }
  }

  function ensureLoop() {
    if (rafId === null) rafId = requestAnimationFrame(draw);
  }

  function onMove(e) {
    hasMouse = true;
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!reduceMotion) ensureLoop();
  }

  function onLeave() {
    hasMouse = false;
    if (!reduceMotion) ensureLoop();
  }

  function onClick(e) {
    if (reduceMotion) return;
    ripples.push({ x: e.clientX, y: e.clientY, start: performance.now() });
    if (ripples.length > 6) ripples.shift(); // cap concurrent ripples
    ensureLoop();
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      draw(performance.now());
    }, 150);
  }

  function onVisibility() {
    if (document.hidden) {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    } else {
      ensureLoop();
    }
  }

  resize();
  draw(performance.now());

  window.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("mouseleave", onLeave, { passive: true });
  window.addEventListener("click", onClick, { passive: true });
  window.addEventListener("touchstart", function (e) {
    if (reduceMotion || !e.touches || !e.touches[0]) return;
    ripples.push({ x: e.touches[0].clientX, y: e.touches[0].clientY, start: performance.now() });
    if (ripples.length > 6) ripples.shift();
    ensureLoop();
  }, { passive: true });
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVisibility);
})();
