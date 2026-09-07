(function () {
  "use strict";

  var track = document.querySelector("[data-char-track]");
  if (!track) return;

  var cards = Array.prototype.slice.call(track.querySelectorAll("[data-char-card]"));
  if (!cards.length) return;

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hoverLock = false;

  // ---- Fix: clicking a card sets it to "is-loading" and then navigates
  // away. If the browser restores this exact page from its back/forward
  // cache (e.g. the user hits the Back button after opening a project),
  // that "is-loading" class — and its now-finished progress bar — comes
  // back frozen on screen. `pageshow` fires on every load, including
  // bfcache restores, so we use it to always clear that state. ----
  window.addEventListener("pageshow", function () {
    cards.forEach(function (card) {
      card.classList.remove("is-loading");
      card.style.removeProperty("--load-duration");
    });
  });

  // ---- Right-hand "preview panel": mirrors whichever card is active by
  // copying its data straight into the panel's text/image/link ----
  var preview = document.querySelector("[data-char-preview]");
  var previewTargets = {};
  if (preview) {
    Array.prototype.forEach.call(preview.querySelectorAll("[data-preview-target]"), function (el) {
      previewTargets[el.getAttribute("data-preview-target")] = el;
    });
  }

  function setPreview(card) {
    if (!preview || !card) return;

    var title = card.getAttribute("data-preview-title") || "";
    var category = card.getAttribute("data-preview-category") || "";
    var summary = card.getAttribute("data-preview-summary") || "";
    var image = card.getAttribute("data-preview-image") || "";
    var num = card.getAttribute("data-preview-num") || "";
    var href = card.getAttribute("data-preview-href") || card.getAttribute("href");
    var isExternal = card.getAttribute("data-preview-external") === "true";

    if (previewTargets.title) previewTargets.title.textContent = title;
    if (previewTargets.num) previewTargets.num.textContent = num;

    if (previewTargets.category) {
      previewTargets.category.textContent = category;
      previewTargets.category.hidden = !category;
    }
    if (previewTargets.summary) {
      previewTargets.summary.textContent = summary;
      previewTargets.summary.hidden = !summary;
    }
    if (previewTargets.image) {
      previewTargets.image.src = image;
      previewTargets.image.alt = title;
    }
    if (previewTargets.cta) {
      previewTargets.cta.setAttribute("href", href);
      if (isExternal) {
        previewTargets.cta.setAttribute("target", "_blank");
        previewTargets.cta.setAttribute("rel", "noopener");
      } else {
        previewTargets.cta.removeAttribute("target");
        previewTargets.cta.removeAttribute("rel");
      }
    }

    if (previewTargets.journal) {
      var journalTitle = card.getAttribute("data-preview-journal-title");
      previewTargets.journal.hidden = !journalTitle;
      if (journalTitle) {
        if (previewTargets["journal-title"]) previewTargets["journal-title"].textContent = journalTitle;
        if (previewTargets["journal-summary"]) {
          previewTargets["journal-summary"].textContent = card.getAttribute("data-preview-journal-summary") || "";
        }
        if (previewTargets["journal-image"]) {
          previewTargets["journal-image"].src = card.getAttribute("data-preview-journal-image") || "";
          previewTargets["journal-image"].alt = journalTitle;
        }
        if (previewTargets["journal-link"]) {
          previewTargets["journal-link"].setAttribute("href", card.getAttribute("data-preview-journal-href") || "#");
        }
      }
    }

    // Quick refresh flash so a swap reads as an update, not a glitch
    preview.classList.remove("is-updating");
    void preview.offsetWidth; // restart the animation
    preview.classList.add("is-updating");
  }

  // ---- "Selection cursor": highlight whichever card is closest to the
  // centre of the carousel — via hover on desktop, via scroll position
  // (and keyboard focus) everywhere else ----
  function setActive(card) {
    cards.forEach(function (c) {
      c.classList.toggle("is-active", c === card);
    });
    track.classList.toggle("has-active", !!card);
    if (card) setPreview(card);
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

  // ---- Mouse wheel support: a vertical scroll/wheel gesture over the
  // carousel moves it horizontally instead. We only take over when the
  // gesture reads as vertical (so trackpad horizontal swipes still work
  // natively) and only when the carousel actually has room to move that
  // way — otherwise we let the event through so the page keeps scrolling
  // normally once the roster is fully scrolled to either end. ----
  track.addEventListener(
    "wheel",
    function (event) {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

      var maxScroll = track.scrollWidth - track.clientWidth;
      if (maxScroll <= 0) return;

      var atEnd = event.deltaY > 0 && track.scrollLeft >= maxScroll - 1;
      var atStart = event.deltaY < 0 && track.scrollLeft <= 1;
      if (atEnd || atStart) return;

      event.preventDefault();
      track.scrollLeft += event.deltaY;
    },
    { passive: false }
  );

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
