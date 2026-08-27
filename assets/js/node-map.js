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
    var path = container.querySelector(".node-map-line");
    var items = container.querySelectorAll(".node-map-item");
    if (!svg || !path || items.length < 2) return;

    function redraw() {
      var rect = container.getBoundingClientRect();
      var w = rect.width, h = rect.height;
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);

      var d = "";
      for (var i = 0; i < items.length; i++) {
        var r = items[i].getBoundingClientRect();
        var x = r.left - rect.left + r.width / 2;
        var y = r.top - rect.top + r.height / 2;
        d += (i === 0 ? "M" : "L") + x.toFixed(1) + "," + y.toFixed(1) + " ";
      }
      path.setAttribute("d", d.trim());
    }

    redraw();
    window.addEventListener("resize", debounce(redraw, 150));
    window.addEventListener("load", redraw);
  }

  var maps = document.querySelectorAll(".node-map");
  for (var i = 0; i < maps.length; i++) initNodeMap(maps[i]);
})();
