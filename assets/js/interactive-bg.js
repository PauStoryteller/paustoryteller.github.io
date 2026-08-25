/**
 * Fondo interactivo: una rejilla de puntos (a juego con la textura estática
 * de puntos ya presente en el body) que reacciona a la posición del cursor
 * como si fuera un pequeño "foco" recorriendo la pantalla, con algunos
 * puntos tintados en rojo/morado (la paleta de la web) y una animación de
 * respiración lenta en reposo para que nunca se vea del todo estática.
 *
 * Se desactiva por completo si el usuario prefiere movimiento reducido.
 */
(function () {
  "use strict";

  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  var canvas = document.getElementById("interactive-bg-canvas");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");

  var isMobile = window.matchMedia("(max-width: 680px)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);

  // Misma paleta que _bootstrap-variables / style.scss.
  var COLORS = {
    base: [201, 195, 214], // $steel-ish, gris neutro
    primary: [229, 72, 77], // $primary (rojo)
    secondary: [157, 127, 234], // $secondary (morado)
  };

  var width = 0,
    height = 0,
    dots = [];
  var mouse = { x: -99999, y: -99999 };
  var target = { x: -99999, y: -99999 };
  var ripples = [];
  var rafId = null;
  var lastTime = 0;
  var influence = 0;

  function spacingFor(w) {
    if (w < 680) return 50;
    if (w < 1024) return 44;
    return 38;
  }

  function buildDots() {
    dots = [];
    var spacing = spacingFor(window.innerWidth) * dpr;
    var cols = Math.ceil(width / spacing) + 1;
    var rows = Math.ceil(height / spacing) + 1;
    var idx = 0;

    for (var i = 0; i <= cols; i++) {
      for (var j = 0; j <= rows; j++) {
        idx++;
        // Distribución pseudoaleatoria determinista (sin Math.random) para
        // que no "salte" la disposición de colores al redimensionar.
        var roll = (i * 131 + j * 977) % 100;
        var colorType = "base";
        if (roll < 7) colorType = "primary";
        else if (roll < 14) colorType = "secondary";

        dots.push({
          x: i * spacing + (j % 2 ? spacing / 2 : 0),
          y: j * spacing,
          baseR: (1.0 + (roll % 5) * 0.16) * dpr,
          color: COLORS[colorType],
          phase: (idx * 0.37) % (Math.PI * 2),
        });
      }
    }

    influence = (isMobile ? 150 : 190) * dpr;
  }

  function resize() {
    width = canvas.width = window.innerWidth * dpr;
    height = canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    buildDots();
  }

  function setTarget(clientX, clientY) {
    target.x = clientX * dpr;
    target.y = clientY * dpr;
  }

  function onPointerMove(e) {
    setTarget(e.clientX, e.clientY);
  }

  function onTouchMove(e) {
    if (e.touches && e.touches[0]) {
      setTarget(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  function onLeave() {
    target.x = -99999 * dpr;
    target.y = -99999 * dpr;
  }

  function addRipple(clientX, clientY) {
    ripples.push({ x: clientX * dpr, y: clientY * dpr, start: performance.now() });
    if (ripples.length > 6) ripples.shift();
  }

  window.addEventListener("mousemove", onPointerMove, { passive: true });
  window.addEventListener("mouseleave", onLeave, { passive: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true });
  window.addEventListener("touchend", onLeave, { passive: true });
  window.addEventListener(
    "mousedown",
    function (e) {
      addRipple(e.clientX, e.clientY);
    },
    { passive: true }
  );
  window.addEventListener(
    "touchstart",
    function (e) {
      if (e.touches && e.touches[0]) {
        addRipple(e.touches[0].clientX, e.touches[0].clientY);
      }
    },
    { passive: true }
  );

  var resizeTimer;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId) {
      lastTime = performance.now();
      rafId = requestAnimationFrame(draw);
    }
  });

  function draw(now) {
    rafId = requestAnimationFrame(draw);
    lastTime = now;

    mouse.x += (target.x - mouse.x) * 0.12;
    mouse.y += (target.y - mouse.y) * 0.12;

    ctx.clearRect(0, 0, width, height);

    var t = now * 0.001;

    for (var k = 0; k < dots.length; k++) {
      var d = dots[k];
      var dx = d.x - mouse.x;
      var dy = d.y - mouse.y;
      var dist = Math.sqrt(dx * dx + dy * dy);

      var influenceAmt = 0;
      if (dist < influence) {
        influenceAmt = 1 - dist / influence;
        influenceAmt *= influenceAmt; // easing cuadrático
      }

      var idle = (Math.sin(t * 0.6 + d.phase) + 1) * 0.5; // 0..1, respiración
      var alpha = 0.035 + idle * 0.05 + influenceAmt * 0.85;
      var r = d.baseR * (1 + influenceAmt * 2.4 + idle * 0.15);

      var c = d.color;
      ctx.beginPath();
      ctx.fillStyle =
        "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + Math.min(alpha, 0.95) + ")";
      ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (var r2 = ripples.length - 1; r2 >= 0; r2--) {
      var rp = ripples[r2];
      var elapsed = now - rp.start;
      var duration = 700;
      if (elapsed > duration) {
        ripples.splice(r2, 1);
        continue;
      }
      var p = elapsed / duration;
      var radius = p * 140 * dpr;
      var op = (1 - p) * 0.35;
      ctx.beginPath();
      ctx.strokeStyle = "rgba(229,72,77," + op + ")";
      ctx.lineWidth = 1.5 * dpr;
      ctx.arc(rp.x, rp.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  resize();
  lastTime = performance.now();
  rafId = requestAnimationFrame(draw);
})();
