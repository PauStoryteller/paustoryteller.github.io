(function () {
  "use strict";

  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      var args = arguments;
      t = setTimeout(function () { fn.apply(null, args); }, wait);
    };
  }

  function initNodeMap(container) {
    var svg = container.querySelector(".node-map-svg");
    var linesGroup = container.querySelector(".node-map-lines");
    var items = Array.prototype.slice.call(container.querySelectorAll(".node-map-item"));
    if (!svg || !linesGroup || items.length < 2) return;

    var lines = [];
    for (var i = 0; i < items.length - 1; i++) {
      var line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("class", "node-map-line");
      line.dataset.a = i;
      line.dataset.b = i + 1;
      linesGroup.appendChild(line);
      lines.push(line);
    }

    function anchorRect(el) {
      var circle = el.querySelector(".star-node-circle");
      return circle ? circle.getBoundingClientRect() : el.getBoundingClientRect();
    }

    function redraw() {
      var rect = container.getBoundingClientRect();
      svg.setAttribute("viewBox", "0 0 " + rect.width + " " + rect.height);

      var centers = items.map(function (el) {
        var r = anchorRect(el);
        return {
          x: r.left - rect.left + r.width / 2,
          y: r.top - rect.top + r.height / 2
        };
      });

      lines.forEach(function (line, idx) {
        var a = centers[idx], b = centers[idx + 1];
        line.setAttribute("x1", a.x.toFixed(1));
        line.setAttribute("y1", a.y.toFixed(1));
        line.setAttribute("x2", b.x.toFixed(1));
        line.setAttribute("y2", b.y.toFixed(1));
      });
    }

    items.forEach(function (el, idx) {
      el.addEventListener("mouseenter", function () {
        lines.forEach(function (line) {
          var a = parseInt(line.dataset.a, 10);
          var b = parseInt(line.dataset.b, 10);
          if (a === idx || b === idx) line.classList.add("is-active");
        });
      });
      el.addEventListener("mouseleave", function () {
        lines.forEach(function (line) { line.classList.remove("is-active"); });
      });
      el.addEventListener("focus", function () {
        lines.forEach(function (line) {
          var a = parseInt(line.dataset.a, 10);
          var b = parseInt(line.dataset.b, 10);
          if (a === idx || b === idx) line.classList.add("is-active");
        });
      });
      el.addEventListener("blur", function () {
        lines.forEach(function (line) { line.classList.remove("is-active"); });
      });
    });

    redraw();
    window.addEventListener("resize", debounce(redraw, 150));
    window.addEventListener("load", redraw);
  }

  var maps = document.querySelectorAll(".node-map");
  for (var i = 0; i < maps.length; i++) initNodeMap(maps[i]);
})();
