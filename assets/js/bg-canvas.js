(function () {
  "use strict";
  var canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx = canvas.getContext("2d");

  // Brand palette
  var PRIMARY = [229, 72, 77];     // red
  var SECONDARY = [157, 127, 234]; // purple
  var STARLIGHT = [245, 243, 247]; // near-white

  // ---- Tunables ----
  var BG_AREA_PER_STAR = 16000;   // px^2 of page per background star (sparser = less uniform)
  var MAX_BG_STARS = 190;
  var CLUSTER_AREA_PER_INSTANCE = 190000; // one constellation shape roughly every this many px^2
  var MAX_CLUSTERS = 9;
  var CLUSTER_MIN_GAP = 140;      // px, keep constellation shapes from overlapping each other

  var CLICK_RADIUS = 260;         // how far the expanding wave reaches
  var CLICK_LIFE = 1900;          // ms, slow and dreamy rather than a snap
  var MAX_PULSES = 3;
  var WAVE_BAND = 26;             // px, thickness of the "leading edge" that lights stars as it passes

  var SHOOTING_STAR_MIN_GAP = 6000;
  var SHOOTING_STAR_MAX_GAP = 13000;

  var W = 0, H = 0, DPR = 1;
  var bgStars = [];        // scattered, unlinked background stars
  var clusters = [];       // designed constellation shapes: { stars:[...], links:[[i,j],...] }
  var allStars = [];       // bgStars + every cluster star, flattened (for click lookups)
  var pulses = [];         // click feedback: temporary partial connections
  var shootingStars = [];
  var rafId = null;
  var resizeTimer = null;
  var nextShootingStarAt = 0;

  // A handful of hand-drawn constellation shapes, in a 0-100 local coordinate box.
  // Kept irregular on purpose - real constellations are lopsided, not neat grids.
  var TEMPLATES = [
    { points: [[8, 78], [46, 12], [92, 66]], links: [[0, 1], [1, 2]] },                       // simple peak
    { points: [[0, 55], [24, 8], [48, 52], [74, 4], [100, 46]], links: [[0, 1], [1, 2], [2, 3], [3, 4]] }, // Cassiopeia-ish W
    { points: [[4, 92], [34, 66], [58, 74], [86, 24], [100, 6]], links: [[0, 1], [1, 2], [2, 3], [3, 4]] }, // hook/dipper
    { points: [[6, 18], [40, 82], [70, 10], [100, 56]], links: [[0, 1], [1, 2], [2, 3]] },     // zigzag
    { points: [[50, 0], [86, 40], [58, 100], [10, 46]], links: [[0, 1], [1, 2], [2, 3], [3, 0]] }, // kite
    { points: [[0, 30], [38, 0], [70, 34], [100, 12]], links: [[0, 1], [1, 2], [2, 3]] }        // shallow arc
  ];

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

  function makeStar(x, y, weight) {
    // weight: 0 = ordinary background star, 1 = a constellation star (slightly more prominent)
    var colorRoll = Math.random();
    var color = STARLIGHT;
    if (colorRoll < 0.08) color = PRIMARY;
    else if (colorRoll < 0.15) color = SECONDARY;

    var sizeRoll = Math.random();
    var r = sizeRoll > 0.9 ? 2.3 + Math.random() * 1.3 : 1.0 + Math.random() * 1.3; // bigger, softer stars, rare "hero" stars
    if (weight) r += 0.3;

    return {
      x: x, y: y, r: r,
      baseAlpha: (weight ? 0.5 : 0.28) + Math.random() * 0.4,
      color: color,
      phase: Math.random() * Math.PI * 2,
      speed: 0.0005 + Math.random() * 0.0013,
      boost: 0,
      hero: sizeRoll > 0.9,
      // set for cluster stars only, so a wave passing through can find and
      // brighten the constellation links that star belongs to
      clusterIndex: -1,
      starIndex: -1
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
      bgStars.push(makeStar(x, y, 0));
    }
  }

  // ---- Designed constellation shapes, scattered with random placement ----
  function buildClusters() {
    clusters = [];
    var count = Math.min(MAX_CLUSTERS, Math.max(2, Math.round((W * H) / CLUSTER_AREA_PER_INSTANCE)));
    var centers = [];

    for (var i = 0; i < count; i++) {
      var placed = false;
      for (var attempt = 0; attempt < 12 && !placed; attempt++) {
        var cx = W * (0.08 + Math.random() * 0.84);
        var cy = H * (0.06 + Math.random() * 0.88);
        var farEnough = centers.every(function (c) {
          return Math.hypot(c.x - cx, c.y - cy) > CLUSTER_MIN_GAP * 1.6;
        });
        if (!farEnough) continue;

        var tpl = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
        var scale = 70 + Math.random() * 90;
        var rotation = Math.random() * Math.PI * 2;
        var cos = Math.cos(rotation), sin = Math.sin(rotation);

        var clusterIdx = clusters.length;
        var stars = tpl.points.map(function (p, si) {
          var lx = (p[0] / 100 - 0.5) * scale;
          var ly = (p[1] / 100 - 0.5) * scale;
          var rx = lx * cos - ly * sin;
          var ry = lx * sin + ly * cos;
          var star = makeStar(cx + rx, cy + ry, 1);
          star.clusterIndex = clusterIdx;
          star.starIndex = si;
          return star;
        });

        clusters.push({
          stars: stars,
          links: tpl.links,
          linkBoost: tpl.links.map(function () { return 0; }),
          phase: Math.random() * Math.PI * 2
        });
        centers.push({ x: cx, y: cy });
        placed = true;
      }
    }
  }

  function flattenStars() {
    allStars = bgStars.slice();
    for (var i = 0; i < clusters.length; i++) allStars = allStars.concat(clusters[i].stars);
  }

  function nearestStars(x, y, maxDist, count) {
    var found = [];
    for (var i = 0; i < allStars.length; i++) {
      var s = allStars[i];
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
    buildClusters();
    flattenStars();
  }

  // ---- Drawing ----
  function drawStar(s, now) {
    var twinkle = 0.6 + 0.4 * Math.sin(now * s.speed + s.phase);
    var alpha = Math.min(1, s.baseAlpha * twinkle + s.boost);
    s.boost *= 0.9;
    if (alpha < 0.03) return;

    var r = s.r + s.boost * 1.6;
    ctx.beginPath();
    ctx.fillStyle = rgba(s.color, alpha);
    ctx.arc(s.x, s.y, r, 0, 6.2832);
    ctx.fill();

    if (s.hero && alpha > 0.5) {
      ctx.beginPath();
      ctx.fillStyle = rgba(s.color, alpha * 0.1);
      ctx.arc(s.x, s.y, r * 4.2, 0, 6.2832);
      ctx.fill();
    }
  }

  function drawClusterLinks(now) {
    for (var i = 0; i < clusters.length; i++) {
      var c = clusters[i];
      var shimmer = 0.5 + 0.5 * Math.sin(now * 0.00025 + c.phase);
      var baseAlpha = 0.05 + 0.07 * shimmer;
      for (var j = 0; j < c.links.length; j++) {
        var a = c.stars[c.links[j][0]], b = c.stars[c.links[j][1]];
        var boost = c.linkBoost[j];
        var alpha = baseAlpha + boost * 0.45;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = rgba(SECONDARY, alpha);
        ctx.lineWidth = 1 + boost * 0.6;
        ctx.stroke();
        c.linkBoost[j] *= 0.9;
      }
    }
  }

  // Click feedback: a soft ring expands outward from the tap. As its leading
  // edge sweeps past a star, that star gets a gentle, once-only glow - and if
  // the star belongs to an already-drawn constellation, the links it's part
  // of brighten too, as if the wave were waking that shape up. Nothing new is
  // invented or wired together; the wave only reveals what's already there.
  function spawnPulse(x, y) {
    var candidates = nearestStars(x, y, CLICK_RADIUS);
    pulses.push({
      x: x, y: y,
      start: performance.now(),
      candidates: candidates,
      touched: new Array(candidates.length)
    });
    if (pulses.length > MAX_PULSES) pulses.shift();
  }

  function easeOutCubic(t) {
    var f = t - 1;
    return f * f * f + 1;
  }

  function drawPulses(now) {
    pulses = pulses.filter(function (p) { return now - p.start < CLICK_LIFE; });
    for (var i = 0; i < pulses.length; i++) {
      var p = pulses[i];
      var t = (now - p.start) / CLICK_LIFE;
      var radius = easeOutCubic(t) * CLICK_RADIUS;
      var ringAlpha = (1 - t) * 0.16;

      // the ring itself: one soft expanding circle, fading as it grows
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, 6.2832);
      ctx.strokeStyle = rgba(SECONDARY, ringAlpha);
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // light up whatever the leading edge is passing over right now, once each
      for (var k = 0; k < p.candidates.length; k++) {
        if (p.touched[k]) continue;
        var entry = p.candidates[k];
        if (entry.d > radius) continue;
        if (radius - entry.d > WAVE_BAND) continue; // wave has already fully passed, don't re-trigger
        p.touched[k] = true;

        var falloff = 1 - entry.d / CLICK_RADIUS; // farther stars respond a touch dimmer
        var star = entry.star;
        star.boost = Math.max(star.boost, 0.4 * falloff);

        if (star.clusterIndex !== -1) {
          var cluster = clusters[star.clusterIndex];
          for (var li = 0; li < cluster.links.length; li++) {
            if (cluster.links[li][0] === star.starIndex || cluster.links[li][1] === star.starIndex) {
              cluster.linkBoost[li] = Math.min(1, cluster.linkBoost[li] + 0.8 * falloff);
            }
          }
        }
      }

      // faint mark at the exact click point
      var markAlpha = (1 - t) * 0.35;
      ctx.beginPath();
      ctx.fillStyle = rgba(PRIMARY, markAlpha);
      ctx.arc(p.x, p.y, 1.3, 0, 6.2832);
      ctx.fill();
    }
  }

  function maybeSpawnShootingStar(now) {
    if (reduceMotion) return;
    if (now < nextShootingStarAt) return;
    nextShootingStarAt = now + SHOOTING_STAR_MIN_GAP + Math.random() * (SHOOTING_STAR_MAX_GAP - SHOOTING_STAR_MIN_GAP);

    var startX = Math.random() * W * 0.6 + W * 0.2;
    var startY = Math.random() * Math.min(H, window.innerHeight) * 0.5;
    var angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.3;
    var dist = 140 + Math.random() * 120;
    shootingStars.push({
      x1: startX, y1: startY,
      x2: startX + Math.cos(angle) * dist,
      y2: startY + Math.sin(angle) * dist,
      start: now,
      life: 700 + Math.random() * 300
    });
  }

  function drawShootingStars(now) {
    shootingStars = shootingStars.filter(function (s) { return now - s.start < s.life; });
    for (var i = 0; i < shootingStars.length; i++) {
      var s = shootingStars[i];
      var t = (now - s.start) / s.life;
      var headX = s.x1 + (s.x2 - s.x1) * t;
      var headY = s.y1 + (s.y2 - s.y1) * t;
      var tailX = s.x1 + (s.x2 - s.x1) * Math.max(0, t - 0.35);
      var tailY = s.y1 + (s.y2 - s.y1) * Math.max(0, t - 0.35);
      var alpha = Math.sin(Math.min(1, t) * Math.PI);

      var grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
      grad.addColorStop(0, rgba(STARLIGHT, 0));
      grad.addColorStop(1, rgba(STARLIGHT, alpha * 0.9));
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);

    drawClusterLinks(now);
    drawPulses(now);
    for (var i = 0; i < allStars.length; i++) drawStar(allStars[i], now);
    drawShootingStars(now);
    maybeSpawnShootingStar(now);

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
