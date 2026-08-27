(function () {
  "use strict";
  var canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx = canvas.getContext("2d");

  var PRIMARY = [229, 72, 77];    // $primary red
  var SECONDARY = [157, 127, 234]; // $secondary purple

  var LINK_DIST = 150;       // max distance to draw a connection between two points
  var HOVER_LINK_DIST = 210; // max distance for the cursor to "join" nearby points
  var MIN_POINT_DIST = 40;   // minimum spacing between points when generating them
  var PULSE_SPEED = 0.35;    // px per ms
  var PULSE_WIDTH = 70;
  var PULSE_LIFE = 1400;     // ms
  var PULSE_STRENGTH = 0.85;

  var W = 0, H = 0, DPR = 1;
  var points = [];
  var mouseX = -9999, mouseY = -9999;
  var hasMouse = false;
  var pulses = [];
  var rafId = null;
  var resizeTimer = null;

  function lerpColor(a, b, t) {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    ];
  }

  function rgba(c, a) {
    return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a.toFixed(3) + ")";
  }

  function buildPoints() {
    points = [];
    var area = W * H;
    var count = Math.round(Math.min(230, Math.max(60, area / 11500)));
    var attempts = 0;
    var maxAttempts = count * 50;
    while (points.length < count && attempts < maxAttempts) {
      attempts++;
      var x = Math.random() * W;
      var y = Math.random() * H;
      var ok = true;
      for (var i = 0; i < points.length; i++) {
        var dx = points[i].bx - x, dy = points[i].by - y;
        if (dx * dx + dy * dy < MIN_POINT_DIST * MIN_POINT_DIST) { ok = false; break; }
      }
      if (!ok) continue;
      var colorT = Math.min(1, Math.max(0, (x + y * 0.4) / (W + H * 0.4)));
      points.push({
        bx: x, by: y,
        x: x, y: y,
        phase: Math.random() * Math.PI * 2,
        amp: 8 + Math.random() * 16,
        speed: 0.00022 + Math.random() * 0.00035,
        r: 1.5 + Math.random() * 1.7,
        color: lerpColor(PRIMARY, SECONDARY, colorT)
      });
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
    buildPoints();
  }

  function pulseBoostAt(x, y, now) {
    var boost = 0;
    for (var i = 0; i < pulses.length; i++) {
      var p = pulses[i];
      var age = now - p.start;
      var radius = age * PULSE_SPEED;
      var diff = Math.abs(Math.hypot(x - p.x, y - p.y) - radius);
      if (diff < PULSE_WIDTH) {
        var strength = (1 - diff / PULSE_WIDTH) * (1 - age / PULSE_LIFE) * PULSE_STRENGTH;
        if (strength > boost) boost = strength;
      }
    }
    return boost;
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);

    if (pulses.length) {
      pulses = pulses.filter(function (p) { return now - p.start < PULSE_LIFE; });
    }

    // update positions (gentle independent float)
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      if (!reduceMotion) {
        p.x = p.bx + Math.sin(now * p.speed + p.phase) * p.amp;
        p.y = p.by + Math.cos(now * p.speed * 0.85 + p.phase) * p.amp;
      } else {
        p.x = p.bx;
        p.y = p.by;
      }
    }

    // connections between nearby points
    for (var a = 0; a < points.length; a++) {
      for (var b = a + 1; b < points.length; b++) {
        var pa = points[a], pb = points[b];
        var dx = pa.x - pb.x, dy = pa.y - pb.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > LINK_DIST) continue;
        var mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
        var boost = pulses.length ? pulseBoostAt(mx, my, now) : 0;
        var alpha = (1 - dist / LINK_DIST) * 0.22 + boost * 0.5;
        if (alpha < 0.02) continue;
        ctx.strokeStyle = rgba(pa.color, alpha);
        ctx.lineWidth = 1 + boost * 1.4;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();
      }
    }

    // cursor as a phantom node: link to nearby points
    if (hasMouse) {
      for (var c = 0; c < points.length; c++) {
        var pc = points[c];
        var dxm = pc.x - mouseX, dym = pc.y - mouseY;
        var distm = Math.sqrt(dxm * dxm + dym * dym);
        if (distm < HOVER_LINK_DIST) {
          var a2 = (1 - distm / HOVER_LINK_DIST) * 0.8;
          ctx.strokeStyle = rgba(pc.color, a2);
          ctx.lineWidth = 1.2 + (1 - distm / HOVER_LINK_DIST) * 1.2;
          ctx.beginPath();
          ctx.moveTo(mouseX, mouseY);
          ctx.lineTo(pc.x, pc.y);
          ctx.stroke();
        }
      }
    }

    // points on top
    for (var k = 0; k < points.length; k++) {
      var pk = points[k];
      var hoverBoost = 0;
      if (hasMouse) {
        var dh = Math.hypot(pk.x - mouseX, pk.y - mouseY);
        if (dh < HOVER_LINK_DIST) hoverBoost = (1 - dh / HOVER_LINK_DIST);
      }
      var pulseBoost = pulses.length ? pulseBoostAt(pk.x, pk.y, now) : 0;
      var boost = Math.max(hoverBoost, pulseBoost);
      var radius = pk.r + boost * 4.2;
      var alpha = 0.55 + boost * 0.55;
      ctx.beginPath();
      ctx.fillStyle = rgba(pk.color, alpha);
      ctx.arc(pk.x, pk.y, radius, 0, 6.2832);
      ctx.fill();
    }

    if (!reduceMotion) {
      rafId = requestAnimationFrame(draw);
    } else {
      rafId = null;
    }
  }

  function ensureLoop() {
    if (rafId === null && !reduceMotion) rafId = requestAnimationFrame(draw);
  }

  function onMove(e) {
    hasMouse = true;
    mouseX = e.clientX;
    mouseY = e.clientY;
    ensureLoop();
  }

  function onLeave() {
    hasMouse = false;
  }

  function onClick(e) {
    if (reduceMotion) return;
    pulses.push({ x: e.clientX, y: e.clientY, start: performance.now() });
    if (pulses.length > 5) pulses.shift();
    ensureLoop();
  }

  function onTouch(e) {
    if (reduceMotion || !e.touches || !e.touches[0]) return;
    var t = e.touches[0];
    mouseX = t.clientX; mouseY = t.clientY; hasMouse = true;
    pulses.push({ x: t.clientX, y: t.clientY, start: performance.now() });
    if (pulses.length > 5) pulses.shift();
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
  window.addEventListener("touchstart", onTouch, { passive: true });
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVisibility);
})();
