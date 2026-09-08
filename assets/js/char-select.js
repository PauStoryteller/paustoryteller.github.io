(function () {
  "use strict";

  var viewport = document.querySelector("[data-char-viewport]");
  var track = document.querySelector("[data-char-track]");
  if (!viewport || !track) return;

  var cards = Array.prototype.slice.call(track.querySelectorAll("[data-char-card]"));
  if (!cards.length) return;

  var prevBtn = document.querySelector("[data-char-prev]");
  var nextBtn = document.querySelector("[data-char-next]");

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var activeIndex = 0;

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
    var href = card.getAttribute("data-preview-href") || card.getAttribute("href");
    var isExternal = card.getAttribute("data-preview-external") === "true";

    if (previewTargets.title) previewTargets.title.textContent = title;

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
    if (previewTargets.frame) {
      previewTargets.frame.setAttribute("href", href);
      previewTargets.frame.setAttribute("aria-label", title);
      if (isExternal) {
        previewTargets.frame.setAttribute("target", "_blank");
        previewTargets.frame.setAttribute("rel", "noopener");
      } else {
        previewTargets.frame.removeAttribute("target");
        previewTargets.frame.removeAttribute("rel");
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

  // ---- "Wheel" look: every card gets a data-dist attribute (its distance
  // from the active one), which the CSS uses to shrink/dim/cut cards off
  // the further they sit from the centre. Distance wraps around (the roster
  // loops), so a card near the far end can read as "close" to an active
  // card near the opposite end. ----
  function updateDistances() {
    var total = cards.length;
    cards.forEach(function (card, i) {
      var diff = Math.abs(i - activeIndex);
      var dist = Math.min(diff, total - diff);
      if (dist === 0) {
        card.removeAttribute("data-dist");
      } else if (dist === 1) {
        card.setAttribute("data-dist", "1");
      } else if (dist === 2) {
        card.setAttribute("data-dist", "2");
      } else {
        card.setAttribute("data-dist", "far");
      }
    });
  }

  // ---- "Selection cursor": whichever card is active gets the glow/corner
  // treatment, feeds the preview panel, and becomes the centre of the wheel.
  function setActive(card) {
    if (!card) return;
    var index = cards.indexOf(card);
    if (index === -1) return;
    activeIndex = index;

    cards.forEach(function (c) {
      c.classList.toggle("is-active", c === card);
    });
    track.classList.add("has-active");
    updateDistances();
    setPreview(card);
  }

  // ---- Move the track so the active card sits centred in the viewport.
  // The viewport never scrolls natively — the track just slides via a CSS
  // transform. ----
  function centerCard(card, animate) {
    if (!card) return;
    var maxOffset = Math.max(0, track.scrollWidth - viewport.clientWidth);
    var target = card.offsetLeft + card.offsetWidth / 2 - viewport.clientWidth / 2;
    target = Math.max(0, Math.min(maxOffset, target));

    if (!animate) track.classList.add("no-anim");
    track.style.transform = "translate3d(-" + target + "px, 0, 0)";
    if (!animate) {
      // Force layout so the transform above applies before we remove the
      // "no transition" class, otherwise the browser would animate it.
      void track.offsetWidth;
      track.classList.remove("no-anim");
    }
  }

  // ---- Roster loops: past the last project it wraps back to the first,
  // and before the first it wraps back to the last — so the arrows (and
  // the wheel) never hit a dead end. ----
  function wrapIndex(index) {
    var total = cards.length;
    return ((index % total) + total) % total;
  }

  // Move the selection to whichever card sits before/after the currently
  // active one (looping around the ends), and slide the wheel to recentre
  // on it.
  function stepToCard(direction) {
    var nextIndex = wrapIndex(activeIndex + direction);
    var nextCard = cards[nextIndex];
    setActive(nextCard);
    centerCard(nextCard, true);
    return nextCard;
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      stepToCard(-1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      stepToCard(1);
    });
  }

  // Desktop mouse users can still preview a neighbouring card by hovering
  // it, without that changing the wheel's position — only the arrows (or
  // the keyboard) move the selection itself.
  if (canHover) {
    cards.forEach(function (card) {
      card.addEventListener("mouseenter", function () {
        setPreview(card);
      });
      card.addEventListener("mouseleave", function () {
        setPreview(cards[activeIndex]);
      });
    });
  }

  // Keyboard users tabbing through the roster: focusing a card selects it
  // and recentres the wheel, same as pressing an arrow.
  cards.forEach(function (card, i) {
    card.addEventListener("focus", function () {
      if (i === activeIndex) return;
      setActive(card);
      centerCard(card, true);
    });
  });

  // ---- Land with the default (first, or already-active) card centred,
  // neighbours peeking in on both sides ----
  function centerInitialCard() {
    var initial = cards.find(function (c) { return c.classList.contains("is-active"); }) || cards[0];
    setActive(initial);
    centerCard(initial, false);
  }
  window.setTimeout(centerInitialCard, 60);

  // Keep the active card centred if the viewport is resized (e.g. rotating
  // a tablet, or the browser window changing width).
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      centerCard(cards[activeIndex], false);
    }, 100);
  });

  // ---- Keyboard: left/right arrows move the selection between cards from
  // anywhere in the roster, not just when a specific card has focus ----
  viewport.addEventListener("keydown", function (event) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      stepToCard(1).focus();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepToCard(-1).focus();
    }
  });

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
