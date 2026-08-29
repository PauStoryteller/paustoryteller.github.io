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
  var MAX_BG_STARS = 180;
  var MIN_STAR_GAP = 34;          // px, minimum distance between any two stars - no clumping

  // Click: an expanding wave that visibly links whichever real stars it
  // passes, growing weaker the farther it travels from the tap.
  var CLICK_RADIUS = 260;         // how far the wave can reach
  var CLICK_MAX_STARS = 9;        // how many stars can be swept into one wave
  var CLICK_SPEED = 0.32;         // px/ms, how fast the wave front travels outward
  var CLICK_LIFE = 2600;          // ms - total lifetime of a pulse
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
    var r = sizeRoll > 0.9 ? 2.9 + Math.random() * 1.7 : 1.4 + Math.random() * 1.6; // a touch bigger, rare larger stars

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
  // so the sky has looser and denser patches instead of an even grid - but a
  // minimum gap between stars keeps any patch from clumping into a knot.
  function buildBackgroundStars() {
    bgStars = [];
    var targetCount = Math.min(MAX_BG_STARS, Math.max(35, Math.round((W * H) / BG_AREA_PER_STAR)));

    var blobCount = 3 + Math.floor(Math.random() * 3);
    var blobs = [];
    for (var b = 0; b < blobCount; b++) {
      blobs.push({
        x: Math.random() * W,
        y: Math.random() * H,
        radius: H * (0.2 + Math.random() * 0.24)
      });
    }

    var attempts = 0;
    while (bgStars.length < targetCount && attempts < targetCount * 12) {
      attempts++;
      var x, y;
      if (Math.random() < 0.55 && blobs.length) {
        // biased toward a random blob center, but with a shallower falloff
        // than before so it reads as a loose region, not a dense core
        var blob = blobs[Math.floor(Math.random() * blobs.length)];
        var ang = Math.random() * Math.PI * 2;
        var dist = Math.pow(Math.random(), 1.15) * blob.radius;
        x = blob.x + Math.cos(ang) * dist;
        y = blob.y + Math.sin(ang) * dist;
      } else {
        // thin uniform base so gaps are never fully empty
        x = Math.random() * W;
        y = Math.random() * H;
      }
      if (x < 0 || x > W || y < 0 || y > H) continue;

      var tooClose = false;
      for (var i = 0; i < bgStars.length; i++) {
        if (Math.hypot(bgStars[i].x - x, bgStars[i].y - y) < MIN_STAR_GAP) { tooClose = true; break; }
      }
      if (tooClose) continue;

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

  // Click feedback: an expanding wave. Real stars near the tap connect first,
  // and as the front keeps traveling outward it reaches farther stars too -
  // but weaker each time, and with less time left to shine before the whole
  // pulse dissolves. Nothing permanent is created; every connection here only
  // exists for the moment the wave is passing through it.
  function spawnPulse(x, y) {
    var near = nearestStars(x, y, CLICK_RADIUS, CLICK_MAX_STARS);
    if (!near.length) return;

    // connect them as a wandering nearest-neighbor chain (starting from the
    // point closest to the tap) so the shape reads naturally, not as a tangle
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

    var nodes = path.map(function (star) {
      var dist = Math.hypot(star.x - x, star.y - y);
      return {
        star: star,
        onset: dist / CLICK_SPEED,          // when the wave front reaches this star
        weaken: 1 - dist / CLICK_RADIUS      // farther = weaker, all the way to the end
      };
    });

    var color = Math.random() < 0.5 ? SECONDARY : PRIMARY;
    pulses.push({ start: performance.now(), nodes: nodes, color: color });
    if (pulses.length > MAX_PULSES) pulses.shift();
  }

  // Strength of a single connection at a given moment: 0 before the wave
  // arrives, a quick rise, then a fade that always finishes by CLICK_LIFE -
  // so connections reached late by the wave barely get to exist at all.
  function edgeStrength(elapsed, onset) {
    if (elapsed <= onset) return 0;
    var windowLeft = CLICK_LIFE - onset;
    if (windowLeft <= 0) return 0;
    var local = elapsed - onset;
    var riseTime = Math.min(180, windowLeft * 0.35);
    var s;
    if (local < riseTime) {
      s = easeInOut(local / riseTime);
    } else {
      s = 1 - easeInOut((local - riseTime) / (windowLeft - riseTime));
    }
    return Math.max(0, Math.min(1, s));
  }

  function drawPulses(now) {
    pulses = pulses.filter(function (p) { return now - p.start < CLICK_LIFE; });
    for (var i = 0; i < pulses.length; i++) {
      var p = pulses[i];
      var elapsed = now - p.start;

      ctx.strokeStyle = rgba(p.color, 1); // alpha set per-edge below via globalAlpha
      ctx.lineWidth = 1;
      for (var j = 0; j < p.nodes.length - 1; j++) {
        var na = p.nodes[j], nb = p.nodes[j + 1];
        var onset = Math.max(na.onset, nb.onset);
        var strength = edgeStrength(elapsed, onset);
        if (strength <= 0.01) continue;
        var weaken = (na.weaken + nb.weaken) / 2;
        var alpha = strength * weaken * 0.4;
        if (alpha <= 0.01) continue;

        var a = na.star, b = nb.star;
        var mx = (a.x + b.x) / 2 - (b.y - a.y) * 0.06;
        var my = (a.y + b.y) / 2 + (b.x - a.x) * 0.06;
        ctx.beginPath();
        ctx.strokeStyle = rgba(p.color, alpha);
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
        ctx.stroke();
      }

      for (var k = 0; k < p.nodes.length; k++) {
        var node = p.nodes[k];
        var nodeStrength = edgeStrength(elapsed, node.onset);
        if (nodeStrength <= 0) continue;
        node.star.boost = Math.max(node.star.boost, nodeStrength * node.weaken * 0.5);
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
