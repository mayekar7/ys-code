/* =====================================================
   site.js
   Load AFTER: GSAP core, Lenis, SplitText, CustomEase, Swiper
   (GSAP core and Lenis come from Webflow or your own tags).
   Does not use ScrollTrigger.
   ===================================================== */


/* ---------- 1. Lenis smooth scroll (fixed body as scroller) ---------- */
(function () {
  function init() {
    if (typeof Lenis === "undefined") {
      console.error("[Lenis] Library is not loaded.");
      return;
    }

    const lenis = new Lenis({
      wrapper: document.body,
      content: document.documentElement,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      syncTouch: false,
      touchMultiplier: 1,
      wheelMultiplier: 0.8,
      infinite: false
    });

    window.lenis = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    /* Lenis only measures the page height once, so re-measure whenever
       the page grows (images, fonts, tall sections) to keep the bottom reachable. */
    function remeasure() {
      lenis.resize();
    }

    window.addEventListener("load", function () {
      requestAnimationFrame(remeasure);
      setTimeout(remeasure, 500);
      setTimeout(remeasure, 1500);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(remeasure);
    }

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(remeasure);
      Array.prototype.forEach.call(document.body.children, function (child) {
        if (!/^(SCRIPT|STYLE|LINK)$/.test(child.tagName)) ro.observe(child);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


/* ---------- 2. Letter swap (hover) ---------- */
(function () {
  function init() {
    document.querySelectorAll("[data-letter-swap]").forEach(function (el) {
      if (el.dataset.lsReady) return;
      el.dataset.lsReady = "true";

      var label   = el.textContent.trim();
      var reverse = el.dataset.reverse !== "false";   // false = swap upward
      var from    = el.dataset.from || "first";       // first | center | last
      var step    = parseFloat(el.dataset.stagger || "0.03");
      var n       = label.length;

      var wrap = document.createElement("span");
      wrap.className = "ls-wrap";
      wrap.style.setProperty("--ls-dir", reverse ? 1 : -1);

      var sr = document.createElement("span");
      sr.className = "ls-sr";
      sr.textContent = label;
      wrap.appendChild(sr);

      label.split("").forEach(function (ch, i) {
        var dist = from === "last"   ? n - 1 - i
                 : from === "center" ? Math.abs(i - (n - 1) / 2)
                 : i;
        var text = ch === " " ? " " : ch;

        var char = document.createElement("span");
        char.className = "ls-char";

        var a = document.createElement("span");
        a.className = "ls-a";
        a.textContent = text;

        var b = document.createElement("span");
        b.className = "ls-b";
        b.setAttribute("aria-hidden", "true");
        b.textContent = text;

        a.style.transitionDelay = b.style.transitionDelay = (dist * step) + "s";

        char.appendChild(a);
        char.appendChild(b);
        wrap.appendChild(char);
      });

      el.textContent = "";
      el.appendChild(wrap);

      // Trigger on the whole link if the text sits inside one, otherwise on the element
      var target = el.closest("a") || el;
      target.addEventListener("mouseenter", function () { wrap.classList.add("is-hover"); });
      target.addEventListener("mouseleave", function () { wrap.classList.remove("is-hover"); });
    });
  }

  // Wait for fonts so letters are measured with the right typeface
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(init);
  } else {
    window.addEventListener("load", init);
  }
})();


/* ---------- 3. Text slide-up (IntersectionObserver) ---------- */
(function () {
  function showAll() {
    document.querySelectorAll("[data-text-slide-up]").forEach(function (el) {
      el.classList.add("tsu-show");
    });
  }

  function init() {
    gsap.registerPlugin(SplitText, CustomEase);

    CustomEase.create("cssEase", "0.25,0.1,0.25,1");

    function playParagraph(el) {
      const duration = parseFloat(el.getAttribute("data-duration")) || 1.15;
      const delay = parseFloat(el.getAttribute("data-delay")) || 0;
      const stagger = parseFloat(el.getAttribute("data-stagger")) || 0.0095;
      const distance = parseFloat(el.getAttribute("data-distance")) || 0;

      if (!el.isConnected) return;

      el.style.fontKerning = "none";

      const split = SplitText.create(el, {
        type: "lines,chars",
        linesClass: "reveal-line",
        charsClass: "reveal-char"
      });

      const tl = gsap.timeline({
        onComplete: () => split.revert()
      });

      split.lines.forEach((line, lineIndex) => {
        const chars = line.querySelectorAll(".reveal-char");

        chars.forEach((char, charIndex) => {
          tl.fromTo(
            char,
            { opacity: 0, y: distance },
            {
              opacity: 1,
              y: 0,
              duration: duration,
              ease: "cssEase"
            },
            delay + lineIndex * 0.32 + charIndex * stagger
          );
        });
      });

      /* Chars are already at opacity 0 (fromTo applies the start state
         immediately), so it is now safe to reveal the container. */
      el.classList.add("tsu-show");
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      showAll();
      return;
    }

    var els = document.querySelectorAll("[data-text-slide-up]");
    if (!els.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        observer.unobserve(el);
        playParagraph(el);
      });
    }, {
      threshold: 0,
      rootMargin: "0px 0px -12% 0px"
    });

    els.forEach(function (el) {
      if (el.dataset.tsuInitialized === "true") return;
      el.dataset.tsuInitialized = "true";
      observer.observe(el);
    });
  }

  function start(tries) {
    if (
      typeof gsap !== "undefined" &&
      typeof SplitText !== "undefined" &&
      typeof CustomEase !== "undefined"
    ) {
      var go = function () { init(); };
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(go);
      } else {
        go();
      }
    } else if (tries < 50) {
      setTimeout(function () { start(tries + 1); }, 100);
    } else {
      /* Libraries never loaded: don't leave the text invisible */
      showAll();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { start(0); });
  } else {
    start(0);
  }
})();


/* ---------- 4. Gradual spacing (IntersectionObserver) ---------- */
(function () {
  function splitHeading(heading) {
    const text = heading.textContent.trim();
    heading.setAttribute("aria-label", text);
    heading.textContent = "";

    const fragment = document.createDocumentFragment();

    text.split(/(\s+)/).forEach((part) => {
      if (/^\s+$/.test(part)) {
        fragment.appendChild(document.createTextNode(part));
        return;
      }

      const word = document.createElement("span");
      word.className = "gs-word";
      word.setAttribute("aria-hidden", "true");

      [...part].forEach((char) => {
        const span = document.createElement("span");
        span.className = "gs-char";
        span.textContent = char;
        word.appendChild(span);
      });

      fragment.appendChild(word);
    });

    heading.appendChild(fragment);
    return heading.querySelectorAll(".gs-char");
  }

  function setup() {
    var headings = document.querySelectorAll("[data-gradual-spacing]");
    if (!headings.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var heading = entry.target;
        observer.unobserve(heading);

        gsap.to(heading._gsChars, {
          opacity: 1,
          x: 0,
          duration: 0.5,
          stagger: 0.04,
          ease: "power2.out"
        });
      });
    }, {
      threshold: 0,
      rootMargin: "0px 0px -15% 0px"
    });

    headings.forEach(function (heading) {
      if (heading.dataset.gsInitialized === "true") return;
      heading.dataset.gsInitialized = "true";

      var chars = splitHeading(heading);
      heading._gsChars = chars;
      gsap.set(chars, { opacity: 0, x: -20 });
      observer.observe(heading);
    });
  }

  function start(tries) {
    if (typeof gsap !== "undefined") {
      setup();
    } else if (tries < 50) {
      setTimeout(function () { start(tries + 1); }, 100);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { start(0); });
  } else {
    start(0);
  }
})();





/* ---------- 8. Navbar hide on scroll down / show on scroll up ---------- */
(function () {
  var NAV_SELECTOR = ".nav_fixed";

  var HIDE_Y = "-120%";   // scrolling down
  var SHOW_Y = "0%";      // scrolling up
  var TOP_OFFSET = 80;    // always show the navbar near the top of the page
  var TOLERANCE = 6;      // ignore tiny scroll movements (stops jitter)

  function init() {
    var nav = document.querySelector(NAV_SELECTOR);
    if (!nav) {
      console.warn("[navbar] No element found for selector:", NAV_SELECTOR);
      return;
    }

    var body = document.body;
    var lastY = Math.max(0, body.scrollTop);
    var hidden = false;
    var ticking = false;

    nav.style.transition = "transform .5s cubic-bezier(.22,.61,.36,1)";
    nav.style.willChange = "transform";

    function setHidden(state) {
      if (state === hidden) return;
      hidden = state;
      nav.style.transform = "translate3d(0," + (state ? HIDE_Y : SHOW_Y) + ",0)";
    }

    function update() {
      ticking = false;

      /* Clamp: iOS rubber-band scrolling can give negative values */
      var y = Math.max(0, body.scrollTop);

      if (y <= TOP_OFFSET) {
        setHidden(false);
      } else if (Math.abs(y - lastY) >= TOLERANCE) {
        setHidden(y > lastY);
      }

      lastY = y;
    }

    body.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    }, { passive: true });

    update();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


