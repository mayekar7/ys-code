/* =====================================================
   site.js
   Load AFTER: GSAP core, Lenis, SplitText, CustomEase, Swiper
   (GSAP core and Lenis come from Webflow or your own tags).
   Does not use ScrollTrigger.
   ===================================================== */


/* ---------- 0. Page reveal gate ----------
   window.ptReveal is created in the Webflow head code (page transition).
   It resolves when the page is actually on screen: about 0.6s into the
   slide-up transition, or right away on a normal page load.
   On the Home page it also waits for the loader to start fading out
   (or resolves straight away when the loader is skipped).
   Animations below wait for it, so they play while the page slides in,
   right after the loader, and never run unseen while Chrome prerenders. */
function whenRevealed(fn) {
  (window.ptReveal || Promise.resolve()).then(fn);
}


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
        var text = ch === " " ? " " : ch;

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
      var target = el.closest("a, .sp-trigger") || el;
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

    /* Start watching only once the page is revealed (see section 0).
       Until then the text stays hidden by the CSS rule. */
    whenRevealed(function () {
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

        // data-delay is measured in seconds. For example, data-delay="5"
        // waits five seconds before starting the animation.
        var delay = Number(heading.dataset.delay) || 0;

        gsap.to(heading._gsChars, {
          opacity: 1,
          x: 0,
          duration: 0.5,
          stagger: 0.04,
          delay: delay,
          ease: "power2.out"
        });
      });
    }, {
      threshold: 0,
      rootMargin: "0px 0px -15% 0px"
    });

    var ready = [];
    headings.forEach(function (heading) {
      if (heading.dataset.gsInitialized === "true") return;
      heading.dataset.gsInitialized = "true";

      var chars = splitHeading(heading);
      heading._gsChars = chars;
      gsap.set(chars, { opacity: 0, x: -20 });   // hidden straight away
      ready.push(heading);
    });

    /* Start watching only once the page is revealed (see section 0) */
    whenRevealed(function () {
      ready.forEach(function (heading) { observer.observe(heading); });
    });
  }

  function start(tries) {
    if (typeof gsap !== "undefined") {
      setup();
    } else if (tries < 50) {
      setTimeout(function () {
        start(tries + 1);
      }, 100);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      start(0);
    });
  } else {
    start(0);
  }
})();


/* ---------- 5. Fade in (data-fade-in) ----------
   Add the attribute data-fade-in to any element (e.g. .hero-col-wrap).
   It starts hidden (CSS rule in global.css) and fades up into place
   once the page is revealed and the element is in view.
   Optional attributes:
     data-delay="0.3"      seconds to wait (default 0)
     data-duration="1.2"   seconds (default 1.2)
     data-distance="5rem"  how far it moves up (default 5rem, "0" = fade only) */
(function () {
  function showAll() {
    document.querySelectorAll("[data-fade-in]").forEach(function (el) {
      el.classList.add("fi-show");
    });
  }

  function init() {
    var els = document.querySelectorAll("[data-fade-in]");
    if (!els.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      showAll();
      return;
    }

    function play(el) {
      var delay = parseFloat(el.getAttribute("data-delay")) || 0;
      var duration = parseFloat(el.getAttribute("data-duration")) || 1.2;
      var distance = el.getAttribute("data-distance") || "5rem";

      gsap.fromTo(el,
        { y: distance, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: duration,
          delay: delay,
          ease: "power3.out",
          onStart: function () { el.classList.add("fi-show"); },
          onComplete: function () { gsap.set(el, { clearProps: "transform,opacity" }); }
        }
      );
    }

    whenRevealed(function () {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          play(entry.target);
        });
      }, {
        threshold: 0,
        rootMargin: "0px 0px -10% 0px"
      });

      els.forEach(function (el) {
        if (el.dataset.fiInitialized === "true") return;
        el.dataset.fiInitialized = "true";
        observer.observe(el);
      });
    });
  }

  function start(tries) {
    if (typeof gsap !== "undefined") {
      init();
    } else if (tries < 50) {
      setTimeout(function () { start(tries + 1); }, 100);
    } else {
      /* GSAP never loaded: don't leave elements invisible */
      showAll();
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

/* ---------- 6. Page transition: fallback + prefetch (moved from Webflow footer code) ----------
   Chrome / Edge / Safari 18.2+: the slide is done by the CSS in global.css; this part only
   prefetches pages on hover where prerendering isn't available.
   Other browsers: old page recedes + dims while a panel slides up, then the next page loads. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var native = 'onpageswap' in window; /* cross-document view transitions supported */
  var CDN = 'https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/';
  var busy = false, prefetched = {};

  function eligible(event) {
    if (busy || reduce.matches || event.defaultPrevented || event.button > 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
    var link = event.target.closest && event.target.closest('a[href]');
    if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download') ||
        link.closest('[data-pt-ignore]')) return null;
    var url;
    try { url = new URL(link.href, location.href); } catch (e) { return null; }
    if (!/^https?:$/.test(url.protocol) || url.origin !== location.origin ||
        (url.pathname === location.pathname && url.search === location.search)) return null;
    return url;
  }

  /* Prefetch the next page on hover/touch so the transition starts sooner after a click */
  function prefetch(event) {
    var url = eligible(event);
    if (!url || prefetched[url.href]) return;
    prefetched[url.href] = 1;
    var l = document.createElement('link');
    l.rel = 'prefetch'; l.href = url.href;
    document.head.appendChild(l);
  }
  /* Browsers with speculation rules prerender instead (see head) */
  var specRules = HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules');
  if (!specRules) {
    document.addEventListener('mouseover', prefetch, { passive: true });
    document.addEventListener('touchstart', prefetch, { passive: true });
  }

  /* Fallback arrival: lift the cover so the page's own animations play */
  if (root.classList.contains('pt-arrival')) {
    clearTimeout(window.__ptArrivalFallback);
    root.classList.remove('pt-arrival');
    root.classList.add('pt-nav-in');   /* menu drops back in */
    setTimeout(function () { root.classList.remove('pt-nav-in'); }, 1600);
  }
  if (native) return;

  /* ---------- Fallback leave ---------- */
  function load(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  (window.gsap ? Promise.resolve() : load(CDN + 'gsap.min.js'))
    .then(function () { return window.CustomEase ? 0 : load(CDN + 'CustomEase.min.js'); })
    .then(function () {
      gsap.registerPlugin(CustomEase);
      CustomEase.create('ptSnappy', 'M0,0 C0.25,0 0.289,0.216 0.321,0.426 0.355,0.654 0.441,0.838 0.496,0.886 0.535,0.92 0.698,1 1,1');
    })
    .catch(function () {});

  function pageColor() {
    var els = [document.body, root];
    for (var i = 0; i < els.length; i++) {
      var c = getComputedStyle(els[i]).backgroundColor;
      if (c && c !== 'transparent' && !/,\s*0\)$/.test(c)) return c;
    }
    return '#faf8f4';
  }
  function layer(bg, z) {
    var el = document.createElement('div');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('data-pt-layer', '');
    el.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:' + z + ';background:' + bg;
    root.appendChild(el);
    return el;
  }

  document.addEventListener('click', function (event) {
    var url = eligible(event);
    if (!url || !window.gsap || !window.CustomEase || !document.body) return;
    event.preventDefault();
    busy = true;
    var bg = pageColor();
    try { sessionStorage.setItem('pt-arrival', bg); } catch (e) {}
    var scrim = layer('rgba(30,30,30,.7)', 2147483645);
    var panel = layer(bg, 2147483646);
    gsap.set(scrim, { opacity: 0 });
    root.style.background = '#1e1e1e';
    /* shrink from the top of the screen (works whether the window or a fixed body scrolls) */
    var fixedBody = getComputedStyle(document.body).position === 'fixed';
    gsap.set(document.body, { transformOrigin: '50% ' + (fixedBody ? 0 : window.scrollY) + 'px' });
    gsap.timeline({
      defaults: { duration: 1.5, ease: 'ptSnappy' },
      onComplete: function () { location.assign(url.href); }
    })
      .to(document.body, { scale: .95, y: '-10rem' }, 0)
      .fromTo(panel, { yPercent: 100 }, { yPercent: 0 }, 0)
      .to(scrim, { opacity: 1, duration: 1, ease: 'power1' }, 0);
  });

  /* Back/forward cache: undo the fallback leave animation */
  window.addEventListener('pageshow', function (event) {
    if (!event.persisted) return;
    busy = false;
    root.classList.remove('pt-arrival');
    root.style.background = '';
    root.querySelectorAll('[data-pt-layer]').forEach(function (el) { el.remove(); });
    if (window.gsap) gsap.set(document.body, { clearProps: 'transform,transformOrigin' });
  });
})();
