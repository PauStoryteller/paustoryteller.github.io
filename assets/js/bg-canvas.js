(function () {
  "use strict";
  var canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ctx = canvas.getContext("2d");

  // Brand palette
  var PRIMARY = [229, 72, 77];    // red
  var SECONDARY = [157, 127, 234]; // purple
  var STARLIGHT = [245, 243, 247]; // near-white (matches $black text color, i.e. light text on dark bg)

  // Tunables
  var AREA_PER_STAR = 9000;      // px^2 of page per star (lower = more stars)
  var MAX_STARS = 260;           // hard cap for very long pages
  var CONSTELLATION_SHARE = 0.22; // fraction of stars eligible to be linked into constellations
  var LINK_MAX_DIST = 150;       // px, max distance for a static constellation link
  var LINK_MAX_PER_STAR = 2;     // max static links drawn from one star
  var HOVER_RADIUS = 130;        // cursor "light" reach
  var HOVER_LINK_DIST = 170;     // draw a temp line from cursor to stars within this range
  var CLICK_LINK_COUNT = 4;      // how many nearby stars a click connects to
  var CLICK_LINK_DIST = 240;     // max distance a click will reach for a new star
  var CLICK_LIFE = 1500;         // ms a click burst lives for
  var MAX_BURSTS = 4;            // concurrent click bursts
  var SHOOTING_STAR_MIN_GAP = 5000; // ms between ambient shooting stars
  var SHOOTING_STAR_MAX_GAP = 11000;

  var W = 0, H = 0, DPR = 1;
  var stars = [];
  var links = [];          // static constellation links: {a, b}
  var mouseX = -9999, mouseY = -9999;
  var hasMouse = false;
  var bursts = [];         // click-triggered constellation bursts
  var shootingStars = [];
  var rafId = null;
  var resizeTimer = null;
  var nextShootingStarAt = 0;
  var lastFrameTime = 0;

  function lerpColor(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }

  function rgba(c, a) {
    return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a.toFixed(3) + ")";
  }

  function pageHeight() {
    var b = document.body, d = document.documentElement;
    return Math.max(
      b.scrollHeight, b.offsetHeight,
      d.scrollHeight, d.offsetHeight, d.clientHeight,
      window.innerHeight
    );
  }

  // ---- Star field + constellation generation ----

  function buildStars() {
    var area = W * H;
    var count = Math.min(MAX_STARS, Math.max(40, Math.round(area / AREA_PER_STAR)));

    stars = [];
    for (var i = 0; i < count; i++) {
      var colorRoll = Math.random();
      var color = STARLIGHT;
      if (colorRoll < 0.12) color = PRIMARY;
      else if (colorRoll < 0.22) color = SECONDARY;

      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.6 + Math.random() * 1.5,
        baseAlpha: 0.35 + Math.random() * 0.55,
        color: color,
        phase: Math.random() * Math.PI * 2,
        speed: 0.0006 + Math.random() * 0.0014,
        boost: 0,               // temporary extra brightness from hover/clicks, eased out each frame
        isNode: Math.random() < CONSTELLATION_SHARE
      });
    }

    buildLinks();
  }

  function buildLinks() {
    links = [];
    var nodes = stars.filter(function (s) { return s.isNode; });

    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      var candidates = [];
      for (var j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        var b = nodes[j];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d <= LINK_MAX_DIST) candidates.push({ star: b, d: d });
      }
      candidates.sort(function (p, q) { return p.d - q.d; });
      for (var k = 0; k < Math.min(LINK_MAX_PER_STAR, candidates.length); k++) {
        var b2 = candidates[k].star;
        // de-dupe (a-b) vs (b-a)
        var exists = links.some(function (l) {
          return (l.a === a && l.b === b2) || (l.a === b2 && l.b === a);
        });
        if (!exists) {
          links.push({ a: a, b: b2, phase: Math.random() * Math.PI * 2 });
        }
      }
    }
  }

  function nearestStars(x, y, maxDist, count) {
    var found = [];
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var d = Math.hypot(s.x - x, s.y - y);
      if (d <= maxDist) found.push({ star: s, d: d });
    }
    found.sort(function (a, b) { return a.d - b.d; });
    return found.slice(0, count);
  }

  // ---- Sizing ----

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = pageHeight();
    if (H > 3200) DPR = Math.min(DPR, 1.25); // guard memory on very long pages

    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildStars();
  }

  // ---- Drawing ----

  function drawStaticLink(l, now, extraAlpha) {
    var shimmer = 0.55 + 0.45 * Math.sin(now * 0.0003 + l.phase);
    var alpha = (0.08 + 0.1 * shimmer) + extraAlpha;
    ctx.beginPath();
    ctx.moveTo(l.a.x, l.a.y);
    ctx.lineTo(l.b.x, l.b.y);
    ctx.strokeStyle = rgba(SECONDARY, Math.min(alpha, 0.5));
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawStar(s, now) {
    var twinkle = 0.6 + 0.4 * Math.sin(now * s.speed + s.phase);
    var alpha = Math.min(1, s.baseAlpha * twinkle + s.boost);
    s.boost *= 0.92; // ease out any temporary glow

    if (alpha < 0.03) return;
    var r = s.r + s.boost * 2.2;

    ctx.beginPath();
    ctx.fillStyle = rgba(s.color, alpha);
    ctx.arc(s.x, s.y, r, 0, 6.2832);
    ctx.fill();

    // soft glow halo for brighter / boosted stars
    if (alpha > 0.7 || s.boost > 0.05) {
      ctx.beginPath();
      ctx.fillStyle = rgba(s.color, alpha * 0.15);
      ctx.arc(s.x, s.y, r * 3.2, 0, 6.2832);
      ctx.fill();
    }
  }

  function drawHoverLinks(now) {
    if (!hasMouse) return;
    var near = nearestStars(mouseX, mouseY, HOVER_LINK_DIST, 5);
    for (var i = 0; i < near.length; i++) {
      var s = near[i].star;
      var t = 1 - near[i].d / HOVER_LINK_DIST;
      s.boost = Math.max(s.boost, t * 0.5);

      ctx.beginPath();
      ctx.moveTo(mouseX, mouseY);
      ctx.lineTo(s.x, s.y);
      ctx.strokeStyle = rgba(PRIMARY, t * 0.35);
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // cursor node itself
    ctx.beginPath();
    ctx.fillStyle = rgba(PRIMARY, 0.5);
    ctx.arc(mouseX, mouseY, 2, 0, 6.2832);
    ctx.fill();
  }

  function spawnBurst(x, y) {
    var near = nearestStars(x, y, CLICK_LINK_DIST, CLICK_LINK_COUNT);
    if (!near.length) return;
    bursts.push({
      x: x, y: y,
      start: performance.now(),
      targets: near.map(function (n) { return n.star; })
    });
    if (bursts.length > MAX_BURSTS) bursts.shift();
  }

  function drawBursts(now) {
    bursts = bursts.filter(function (b) { return now - b.start < CLICK_LIFE; });
    for (var i = 0; i < bursts.length; i++) {
      var b = bursts[i];
      var age = now - b.start;
      var lineT = Math.min(1, age / 450);           // lines draw in fast
      var life = Math.max(0, 1 - age / CLICK_LIFE);  // whole burst fades out

      // expanding ring at the click point
      var ringR = (age / CLICK_LIFE) * 60;
      ctx.beginPath();
      ctx.arc(b.x, b.y, ringR, 0, 6.2832);
      ctx.strokeStyle = rgba(PRIMARY, life * 0.4);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      for (var j = 0; j < b.targets.length; j++) {
        var s = b.targets[j];
        var ex = b.x + (s.x - b.x) * easeOutCubic(lineT);
        var ey = b.y + (s.y - b.y) * easeOutCubic(lineT);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = rgba(SECONDARY, life * 0.55);
        ctx.lineWidth = 1.2;
        ctx.stroke();

        if (lineT >= 1) s.boost = Math.max(s.boost, life * 0.6);
      }

      // click origin node
      ctx.beginPath();
      ctx.fillStyle = rgba(PRIMARY, life * 0.8);
      ctx.arc(b.x, b.y, 1.8 + (1 - life) * 1.5, 0, 6.2832);
      ctx.fill();
    }
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function maybeSpawnShootingStar(now) {
    if (reduceMotion) return;
    if (now < nextShootingStarAt) return;
    nextShootingStarAt = now + SHOOTING_STAR_MIN_GAP + Math.random() * (SHOOTING_STAR_MAX_GAP - SHOOTING_STAR_MIN_GAP);

    var startX = Math.random() * W * 0.6 + W * 0.2;
    var startY = Math.random() * Math.min(H, window.innerHeight) * 0.5;
    var angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.3; // diagonal, down-right-ish
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
      var alpha = Math.sin(Math.min(1, t) * Math.PI); // fade in then out

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

    for (var i = 0; i < links.length; i++) drawStaticLink(links[i], now, 0);
    drawHoverLinks(now);
    drawBursts(now);
    for (var j = 0; j < stars.length; j++) drawStar(stars[j], now);
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

  // ---- Events ----

  function onMove(e) {
    hasMouse = true;
    mouseX = e.pageX;
    mouseY = e.pageY;
  }

  function onLeave() {
    hasMouse = false;
  }

  function onClick(e) {
    if (reduceMotion) return;
    spawnBurst(e.pageX, e.pageY);
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

  // Catch late layout shifts (webfonts swapping, images loading) that change page height
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

  window.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("mouseleave", onLeave, { passive: true });
  window.addEventListener("click", onClick, { passive: true });
  window.addEventListener("touchstart", function (e) {
    if (reduceMotion || !e.touches || !e.touches[0]) return;
    var t = e.touches[0];
    hasMouse = true;
    mouseX = t.pageX;
    mouseY = t.pageY;
    spawnBurst(t.pageX, t.pageY);
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
