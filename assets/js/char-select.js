(function () {
  "use strict";

  var track = document.querySelector("[data-char-track]");
  if (!track) return;

  var cards = Array.prototype.slice.call(track.querySelectorAll("[data-char-card]"));
  if (!cards.length) return;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hoverLock = false;

  // ---- "Selection cursor": highlight whichever card is closest to the
  // centre of the carousel — via hover on desktop, via scroll position
  // (and keyboard focus) everywhere else ----
  function setActive(card) {
    cards.forEach(function (c) {
      c.classList.toggle("is-active", c === card);
    });
    track.classList.toggle("has-active", !!card);
  }

  function updateActiveFromScroll() {
    if (hoverLock) return;
    var viewportRect = track.getBoundingClientRect();
    var center = viewportRect.left + viewportRect.width / 2;
    var closest = null;
    var closestDist = Infinity;
    cards.forEach(function (card) {
      var rect = card.getBoundingClientRect();
      var cardCenter = rect.left + rect.width / 2;
      var dist = Math.abs(cardCenter - center);
      if (dist < closestDist) {
        closestDist = dist;
        closest = card;
      }
    });
    setActive(closest);
  }

  var scrollTicking = false;
  track.addEventListener(
    "scroll",
    function () {
      if (!scrollTicking) {
        window.requestAnimationFrame(function () {
          updateActiveFromScroll();
          scrollTicking = false;
        });
        scrollTicking = true;
      }
    },
    { passive: true }
  );

  if (canHover) {
    cards.forEach(function (card) {
      card.addEventListener("mouseenter", function () {
        hoverLock = true;
        setActive(card);
      });
      card.addEventListener("mouseleave", function () {
        hoverLock = false;
        updateActiveFromScroll();
      });
    });
  }

  // Keyboard users: focusing a card also "selects" it
  cards.forEach(function (card) {
    card.addEventListener("focus", function () {
      hoverLock = true;
      setActive(card);
    });
    card.addEventListener("blur", function () {
      hoverLock = false;
      updateActiveFromScroll();
    });
  });

  window.setTimeout(updateActiveFromScroll, 60);
  window.addEventListener("resize", updateActiveFromScroll);

  // ---- Fake "loading" screen before entering a project ----
  // Respect reduced-motion users and anyone opening in a new tab: let the
  // browser handle those clicks natively instead of intercepting them.
  if (reduceMotion) return;

  cards.forEach(function (card) {
    card.addEventListener("click", function (event) {
      if (event.defaultPrevented) return;
      if (event.button === 1 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      if (card.classList.contains("is-loading")) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      var href = card.getAttribute("href");
      var isExternal = card.getAttribute("target") === "_blank";
      var duration = 400 + Math.floor(Math.random() * 200); // 400–600ms

      card.style.setProperty("--load-duration", duration + "ms");
      card.classList.add("is-loading");

      window.setTimeout(function () {
        if (isExternal) {
          window.open(href, "_blank", "noopener");
          card.classList.remove("is-loading");
        } else {
          window.location.href = href;
        }
      }, duration);
    });
  });
})();
