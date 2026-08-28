(function () {
  "use strict";
  var canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx = canvas.getContext("2d");

  // Muted palette - nothing near pure white, so individual stars stay
  // integrated into the sky rather than popping out of it.
  var PRIMARY = [214, 90, 96];     // muted red
  var SECONDARY = [150, 128, 214]; // muted purple
  var STEEL = [132, 132, 150];     // soft gray, the dominant tone

  // ---- Tunables ----
  var BG_AREA_PER_STAR = 15000;   // px^2 of page per background star (sparser = less uniform)
  var MAX_BG_STARS = 190;

  // Click: no permanent shapes, no highlighting of anything pre-drawn.
  // Every tap builds a small, temporary constellation out of whichever real
  // stars happen to be nearby, then lets it dissolve.
  var CLICK_RADIUS = 170;         // how far a click looks for nearby stars
  var CLICK_MAX_STARS = 5;        // how many stars can join one temporary shape
  var CLICK_LIFE = 2600;          // ms - slow, soft fade in and out
  var CLICK_FADE_IN = 0.22;       // fraction of life spent easing in
  var CLICK_FADE_OUT = 0.55;      // fraction of life where the fade-out begins
  var MAX_PULSES = 3;

  var W = 0, H = 0, DPR = 1;
  var bgStars = [];        // every background star (the only kind of star there is now)
  var pulses = [];         // temporary click-made connections
  var rafId = null;
  var resizeTimer = null;

  function rgba(c, a) {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + Math.max(0, a).toFixed(3) + ")";
  }

  function pageHeight() {
    var b = document.body, d = document.documentElement;
    return Math.max(
      b.scrollHeight, b.offsetHeight,
      d.scrollHeight, d.offsetHeight, d.clientHeight,
      window.innerHeight
    );
  }

  function makeStar(x, y) {
    // Mostly muted gray, with purple and red as the accent notes - kept
    // deliberately low-key so no single star jumps out of the sky.
    var colorRoll = Math.random();
    var color = STEEL;
    if (colorRoll < 0.22) color = PRIMARY;
    else if (colorRoll < 0.52) color = SECONDARY;

    var sizeRoll = Math.random();
    var r = sizeRoll > 0.9 ? 2.6 + Math.random() * 1.5 : 1.2 + Math.random() * 1.5; // rare, slightly larger stars

    return {
      x: x, y: y, r: r,
      // Alpha barely breathes around this base value - present, but never "blinking".
      baseAlpha: 0.3 + Math.random() * 0.28,
      color: color,
      phase: Math.random() * Math.PI * 2,
      speed: 0.00012 + Math.random() * 0.00018, // slow, gentle breathing
      boost: 0
    };
  }

  // ---- Non-uniform background scatter ----
  // A few soft "density blobs" (like faint dust lanes) plus a thin uniform base,
  // so the sky has looser and denser patches instead of an even grid.
  function buildBackgroundStars() {
    bgStars = [];
    var targetCount = Math.min(MAX_BG_STARS, Math.max(35, Math.round((W * H) / BG_AREA_PER_STAR)));

    var blobCount = 3 + Math.floor(Math.random() * 3);
    var blobs = [];
    for (var b = 0; b < blobCount; b++) {
      blobs.push({
        x: Math.random() * W,
        y: Math.random() * H,
        radius: H * (0.18 + Math.random() * 0.22)
      });
    }

    var attempts = 0;
    while (bgStars.length < targetCount && attempts < targetCount * 6) {
      attempts++;
      var x, y;
      if (Math.random() < 0.65 && blobs.length) {
        // biased toward a random blob center
        var blob = blobs[Math.floor(Math.random() * blobs.length)];
        var ang = Math.random() * Math.PI * 2;
        var dist = Math.pow(Math.random(), 1.6) * blob.radius; // denser near the center
        x = blob.x + Math.cos(ang) * dist;
        y = blob.y + Math.sin(ang) * dist;
      } else {
        // thin uniform base so gaps are never fully empty
        x = Math.random() * W;
        y = Math.random() * H;
      }
      if (x < 0 || x > W || y < 0 || y > H) continue;
      bgStars.push(makeStar(x, y));
    }
  }

  function nearestStars(x, y, maxDist, count) {
    var found = [];
    for (var i = 0; i < bgStars.length; i++) {
      var s = bgStars[i];
      var d = Math.hypot(s.x - x, s.y - y);
      if (d <= maxDist) found.push({ star: s, d: d });
    }
    found.sort(function (a, b) { return a.d - b.d; });
    return count ? found.slice(0, count) : found;
  }

  // ---- Sizing ----
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = pageHeight();
    if (H > 3200) DPR = Math.min(DPR, 1.25);

    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    buildBackgroundStars();
  }

  // ---- Drawing ----
  function drawStar(s, now) {
    // A very slow, shallow breathing motion - present but never attention-grabbing.
    var breathe = 0.92 + 0.08 * Math.sin(now * s.speed + s.phase);
    var alpha = Math.min(1, s.baseAlpha * breathe + s.boost);
    s.boost *= 0.94;
    if (alpha < 0.03) return;

    var r = s.r + s.boost * 1.1;
    ctx.beginPath();
    ctx.fillStyle = rgba(s.color, alpha);
    ctx.arc(s.x, s.y, r, 0, 6.2832);
    ctx.fill();
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  // Click feedback: build one small, temporary constellation from whichever
  // real stars are nearby - connected as a wandering path (nearest-neighbor
  // chain) so it reads as a natural shape instead of a tangle - then let the
  // whole thing breathe in and dissolve. Nothing permanent is created or
  // highlighted; it only ever exists for the life of the pulse.
  function spawnPulse(x, y) {
    var near = nearestStars(x, y, CLICK_RADIUS, CLICK_MAX_STARS);
    if (!near.length) return;

    var pool = near.map(function (n) { return n.star; });
    var path = [pool.shift()];
    while (pool.length) {
      var last = path[path.length - 1];
      var bestIdx = 0, bestD = Infinity;
      for (var i = 0; i < pool.length; i++) {
        var d = Math.hypot(pool[i].x - last.x, pool[i].y - last.y);
        if (d < bestD) { bestD = d; bestIdx = i; }
      }
      path.push(pool.splice(bestIdx, 1)[0]);
    }

    var color = Math.random() < 0.5 ? SECONDARY : PRIMARY;
    pulses.push({ start: performance.now(), path: path, color: color });
    if (pulses.length > MAX_PULSES) pulses.shift();
  }

  function drawPulses(now) {
    pulses = pulses.filter(function (p) { return now - p.start < CLICK_LIFE; });
    for (var i = 0; i < pulses.length; i++) {
      var p = pulses[i];
      var t = (now - p.start) / CLICK_LIFE;

      var strength;
      if (t < CLICK_FADE_IN) {
        strength = easeInOut(t / CLICK_FADE_IN);
      } else if (t < CLICK_FADE_OUT) {
        strength = 1;
      } else {
        strength = 1 - easeInOut((t - CLICK_FADE_OUT) / (1 - CLICK_FADE_OUT));
      }
      strength = Math.max(0, Math.min(1, strength));
      if (strength <= 0.01) continue;

      ctx.strokeStyle = rgba(p.color, strength * 0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var j = 0; j < p.path.length - 1; j++) {
        var a = p.path[j], b = p.path[j + 1];
        // a gentle bow instead of a straight line, softer and less mechanical
        var mx = (a.x + b.x) / 2 - (b.y - a.y) * 0.06;
        var my = (a.y + b.y) / 2 + (b.x - a.x) * 0.06;
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
      }
      ctx.stroke();

      for (var k = 0; k < p.path.length; k++) {
        p.path[k].boost = Math.max(p.path[k].boost, strength * 0.3);
      }
    }
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    drawPulses(now);
    for (var i = 0; i < bgStars.length; i++) drawStar(bgStars[i], now);

    if (!reduceMotion) {
      rafId = requestAnimationFrame(draw);
    } else {
      rafId = null;
    }
  }

  function ensureLoop() {
    if (rafId === null && !reduceMotion) rafId = requestAnimationFrame(draw);
  }

  // ---- Events: click/tap only. Hover is intentionally inert. ----
  function onClick(e) {
    if (reduceMotion) return;
    spawnPulse(e.pageX, e.pageY);
  }

  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resize();
      draw(performance.now());
    }, 150);
  }

  resize();
  draw(performance.now());

  window.addEventListener("load", onResize);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(onResize).catch(function () {});
  }
  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(onResize);
    ro.observe(document.body);
  } else {
    setTimeout(onResize, 800);
    setTimeout(onResize, 2000);
  }

  window.addEventListener("click", onClick, { passive: true });
  window.addEventListener("touchstart", function (e) {
    if (reduceMotion || !e.touches || !e.touches[0]) return;
    var t = e.touches[0];
    spawnPulse(t.pageX, t.pageY);
  }, { passive: true });
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    } else {
      ensureLoop();
    }
  });
})();
