/* =====================================================
   home.js  (Home page only)
   Load AFTER: GSAP core + SplitText (loader), Swiper.
   The small loader-skip / wait-for-loader scripts stay in the
   Webflow Home head code (they must run before the first frame).
   ===================================================== */


/* ---------- 0. Loader (moved from Webflow Home footer code) ----------
   Plays on a fresh visit or refresh; skipped when arriving from another
   page of the site (window.ysSkipLoader, set in the Home head code).
   Tells the page to start its animations when the loader starts fading. */
(function () {
  var root = document.querySelector('[data-loader="component"]');
  if (!root) return;
  if (window.ysSkipLoader) { root.style.display = 'none'; return; }  /* came from another page of the site */

  var failsafe;
  var finish = function () {
    if (window.ysLoaderRelease) window.ysLoaderRelease();  /* start page animations (if not already) */
    clearTimeout(failsafe);
    root.style.display = 'none';
    document.documentElement.style.overflow = '';
  };

  // If GSAP failed to load, never leave the page blocked
  if (!window.gsap || !window.SplitText) { finish(); return; }

  document.documentElement.style.overflow = 'hidden';
  failsafe = setTimeout(finish, 12000);

  function init() {
    gsap.registerPlugin(SplitText);

    // Settings (match the React props)
    var DURATION = 1;        // overall speed: higher = slower
    var FADE_OUT = 0.8;
    var EASE = 'power4.out'; // closest to cubic-bezier(0.25,1,0.5,1)

    var q = function (name) { return root.querySelector('[data-loader="' + name + '"]'); };
    var wrap = q('images');
    var imgs = gsap.utils.toArray('[data-loader="image"]', root);
    var text1 = q('text-1');
    var text2 = q('text-2');
    var desc = q('description');
    var total = imgs.length;
    var spread = function (i) { return total === 1 ? 0 : -(110 * (total - 1)) / 2 + i * 110; };

    // Reduced motion: simple fade, no movement
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.to(root, { opacity: 0, duration: 0.5, delay: 0.5, onComplete: finish });
      return;
    }

    var s1 = SplitText.create(text1, { type: 'words' });
    var s2 = SplitText.create(text2, { type: 'words' });
    var sd = SplitText.create(desc, { type: 'words,lines' });
    var textTargets = [s1.words, s2.words, sd.lines];

    gsap.set(textTargets, {
      rotateX: 90, opacity: 0,
      transformPerspective: 1000, transformOrigin: '50% 100%'
    });
    gsap.set(desc, { opacity: 1 });
    gsap.set(imgs, { opacity: 0, zIndex: 0 });

    var tl = gsap.timeline();
    tl.timeScale(1 / DURATION);

    // 1. Stack slides up into view
    tl.fromTo(wrap, { yPercent: 500, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: EASE });
    tl.set([text1, text2], { opacity: 1 }, '<');
    tl.to(imgs, { opacity: 1, duration: 0.5, ease: EASE }, '<');
    tl.to(textTargets, { rotateX: 0, opacity: 1, stagger: 0.08, ease: EASE }, '<+0.5');

    // 2. Layer images in order
    imgs.forEach(function (el, i) {
      tl.to(el, { zIndex: i, duration: 0.1, ease: EASE }, i * 0.2);
    });

    // 3. Fan the stack upward
    tl.to(imgs, {
      scale: function (i) { return 1 + i * 0.15; },
      yPercent: function (i) { return -(i * 20); },
      duration: 1, ease: 'power3.inOut',
      stagger: { each: 0.01, from: 'end' }
    }, '<');

    // 4. Spread into a vertical column
    tl.to(imgs, {
      scale: 1,
      yPercent: function (i) { return spread(i); },
      duration: 1, ease: 'power3.inOut',
      stagger: { each: 0.01, from: 'end' }
    }, '+=0.2');

    // 5. Description + side text rotate out
    tl.to(sd.lines, {
      rotateX: 90, transformOrigin: 'top center', opacity: 0,
      duration: 1, stagger: 0.08, ease: EASE
    }, '<-0.1');
    tl.to(wrap, { yPercent: 0, ease: EASE }, '<');
    tl.to([s1.words, s2.words], {
      opacity: 0, duration: 0.5, rotateX: 90, transformOrigin: 'top center',
      stagger: 0.08, ease: EASE
    });

    // 6. Images fade, then the whole loader fades
    tl.to(imgs, {
      opacity: 0, duration: FADE_OUT,
      stagger: { each: 0.08, from: 'end' },
      onComplete: function () {
        if (window.ysLoaderRelease) window.ysLoaderRelease();  /* loader starts fading: start page animations */
        gsap.to(root, { opacity: 0, duration: FADE_OUT, ease: EASE, onComplete: finish });
      }
    }, '<+0.2');
  }

  // Wait for fonts so SplitText measures lines correctly
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(init); } else { init(); }
})();


(function () {
  function init() {
    var R = document.querySelector(".u-native-services_section");
    if (!R) return;

    var track = R.querySelector(".u-native-services_track");
    var stage = R.querySelector(".u-native-services_stage");
    var stack = R.querySelector(".u-native-services_stack");
    var col = R.querySelector(".u-native-services_col");
    var img1 = R.querySelector(".u-native-services_bg-img-1");
    var others = R.querySelectorAll(".u-native-services_bg-img");
    var cards = R.querySelectorAll(".u-native-services_card");
    var contentBlocks = R.querySelectorAll(".u-content-block");

    /*
      All background images in DOM order:
      [img-1, bg-img, bg-img, bg-img, bg-img, bg-img] = 6 images.
    */
    var imgs = [img1];
    for (var o = 0; o < others.length; o++) imgs.push(others[o]);

    var body = document.body;

    var missing = [];
    if (!track) missing.push("track");
    if (!stage) missing.push("stage");
    if (!stack) missing.push("stack");
    if (!col) missing.push("col");
    if (!cards.length) missing.push("cards");
    if (!img1) missing.push("bg image 1");
    if (imgs.length < 2) missing.push("bg images");

    if (missing.length) {
      console.warn(
        "[native-services] Missing elements, animation disabled:",
        missing.join(", ")
      );
      return;
    }

    if (imgs.length < 6) {
      console.warn(
        "[native-services] Expected 6 background images, found " +
          imgs.length + ". Sequence will use what is available."
      );
    }

    var reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var SMOOTHING = 10;
    var HEIGHTS = ["0%", "15%", "100%", "100%", "100%"];

    var CONTENT_SCALE_START = 1;
    var CONTENT_SCALE_END = 1.1;

    /*
      Images 1-4 play while the stage scales up (0.2 → 1).
      Image 4 stays once scaling finishes and belongs to card 1,
      card 2 → image 5, card 3 → image 6.
    */
    var SCALE_IMAGES = Math.min(4, imgs.length);

    var clamp = function (v) {
      return Math.min(1, Math.max(0, v));
    };

    /*
      Keep the stage square while it scales:
      at the start of scaling it is clipped to a centred square,
      and it opens out to the full stage by the end.
      Set to false to go back to the full-frame image.
    */
    var SQUARE_WHILE_SCALING = true;

    var stageH = stage.offsetHeight;
    var stageW = stage.offsetWidth;
    var cardCenters = [];

    /* BODY SCROLLER */
    var trackStart = 0;

    function getBodyScroll() {
      return body.scrollTop;
    }

    /* Smoothed values and scroll-driven targets */
    var curScale = 0.2;
    var tgtScale = 0.2;

    var curShift = 0;
    var tgtShift = 0;

    var last = -1;
    var lastComplete = null;
    var lastBg = -1;
    var running = false;
    var lastTime = 0;

    /*
      Measure the track's absolute starting position
      relative to the BODY scroll position.
    */
    function measure() {
      stageH = stage.offsetHeight;
      stageW = stage.offsetWidth;

      trackStart =
        track.getBoundingClientRect().top + getBodyScroll();

      var prevH = stack.style.height;
      var prevT = stack.style.transition;

      stack.style.transition = "none";
      stack.style.height = "100%";

      var prevColT = col.style.transition;
      var prevColTf = col.style.transform;

      col.style.transition = "none";
      col.style.transform = "none";

      cardCenters = [];

      for (var i = 0; i < cards.length; i++) {
        cardCenters.push(
          cards[i].offsetTop + cards[i].offsetHeight / 2
        );
      }

      col.style.transform = prevColTf;
      col.style.transition = prevColT;

      stack.style.height = prevH;

      void stack.offsetHeight;

      stack.style.transition = prevT;
    }

    function apply() {
      stage.style.transform = "scale(" + curScale + ")";

      var t = "translateY(" + (-curShift) + "px)";

      for (var j = 0; j < imgs.length; j++) {
        imgs[j].style.transform = t;
      }

      /* Content scaling synced with the stage scale */
      var progress = clamp((curScale - 0.2) / 0.8);

      /*
        Square clip on the whole stage (not just the images), so the
        stage's white background is cut away too and the text behind
        stays visible. Opens to the full frame as scaling ends.
      */
      if (SQUARE_WHILE_SCALING) {
        var side = Math.min(stageW, stageH);
        var open = 1 - progress;
        var insetX = ((stageW - side) / 2) * open;
        var insetY = ((stageH - side) / 2) * open;
        var clip =
          progress >= 1
            ? "none"
            : "inset(" + insetY + "px " + insetX + "px)";
        stage.style.clipPath = clip;
        stage.style.webkitClipPath = clip;
      }

      var cs =
        CONTENT_SCALE_START +
        (CONTENT_SCALE_END - CONTENT_SCALE_START) * progress;

      for (var c = 0; c < contentBlocks.length; c++) {
        contentBlocks[c].style.transform = "scale(" + cs + ")";
      }
    }

    function frame(now) {
      var dt = Math.min(
        0.05,
        (now - lastTime) / 1000 || 0.016
      );

      lastTime = now;

      var f = reduceMotion
        ? 1
        : 1 - Math.exp(-SMOOTHING * dt);

      curScale += (tgtScale - curScale) * f;
      curShift += (tgtShift - curShift) * f;

      var done =
        Math.abs(tgtScale - curScale) < 0.0005 &&
        Math.abs(tgtShift - curShift) < 0.05;

      if (done) {
        curScale = tgtScale;
        curShift = tgtShift;
      }

      apply();

      if (done) {
        running = false;
      } else {
        requestAnimationFrame(frame);
      }
    }

    function run() {
      if (!running) {
        running = true;
        lastTime = performance.now();
        requestAnimationFrame(frame);
      }
    }

    function showBg(index) {
      if (index === lastBg) return;
      lastBg = index;

      for (var m = 0; m < imgs.length; m++) {
        imgs[m].style.opacity = m === index ? "1" : "0";
      }
    }

    function readScroll(snap) {
      var vh = window.innerHeight;
      var mob = window.innerWidth < 810;

      /*
        Read BODY scrollTop instead of calculating the
        track's position from the viewport on every scroll.
      */
      var scrolled = Math.max(
        0,
        getBodyScroll() - trackStart
      );

      /* Smooth stage scale */
      var p = clamp(scrolled / (vh * 0.8));
      var eased = p * p * (3 - 2 * p);

      tgtScale = 0.2 + 0.8 * eased;

      /* Background image movement */
      var sc = scrolled / vh;

      tgtShift =
        clamp(sc / (mob ? 3.7 : 5.2)) * stageH * 0.2;

      /* Discrete animation states */
      var th = mob
        ? [0.1, 0.7, 1.7, 2.7]
        : [0.1, 1.5, 2.2, 3.2];

      var k = 0;

      for (var i = 0; i < th.length; i++) {
        if (sc >= th[i]) k++;
      }

      var complete = p >= 1;
      var a = k - 2;

      if (k !== last || complete !== lastComplete) {
        last = k;
        lastComplete = complete;

        stack.style.height = HEIGHTS[k] || "100%";

        var ty = 0;

        if (a >= 0 && cardCenters[a] !== undefined) {
          ty = stageH / 2 - cardCenters[a];
        }

        col.style.transform = "translateY(" + ty + "px)";

        for (var n = 0; n < cards.length; n++) {
          cards[n].style.opacity =
            complete
              ? (n === a ? "1" : "0.2")
              : "0";
        }
      }

      /*
        Background image:
        - while scaling: step through images 1-4 with scroll progress
        - after scaling: image 4 stays, then each card gets its own
          (card 1 → 4, card 2 → 5, card 3 → 6)
      */
      var bgIndex;

      if (!complete) {
        bgIndex = Math.min(
          SCALE_IMAGES - 1,
          Math.floor(p * SCALE_IMAGES)
        );
      } else {
        bgIndex = Math.min(
          imgs.length - 1,
          SCALE_IMAGES - 1 + Math.max(0, a)
        );
      }

      showBg(bgIndex);

      if (snap) {
        curScale = tgtScale;
        curShift = tgtShift;
        apply();
      } else {
        run();
      }
    }

    var ticking = false;

    function onScroll() {
      if (!ticking) {
        ticking = true;

        requestAnimationFrame(function () {
          ticking = false;
          readScroll(false);
        });
      }
    }

    function remeasure() {
      measure();
      last = -1;
      lastBg = -1;
      readScroll(true);
    }

    /*
      BODY handles scrolling when BODY is the actual
      scrolling container. WINDOW remains as a fallback.
    */
    body.addEventListener("scroll", onScroll, {
      passive: true
    });

    window.addEventListener("scroll", onScroll, {
      passive: true
    });

    window.addEventListener("resize", remeasure);
    window.addEventListener("load", remeasure);

    measure();
    readScroll(true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


(function () {
  const AUTOPLAY_DURATION = 5000;

  function initTabSection(container) {
    const tabs = [...container.querySelectorAll('.u-tab-link')];
    if (!tabs.length) return;

    let timer = null, isInView = false;

    const getCurrentTab = () => tabs.find(t => t.classList.contains('w--current'));
    const clearAutoplay = () => { clearTimeout(timer); timer = null; };

    function resetProgress(tab) {
      const p = tab.querySelector('.tab-progress');
      if (!p) return;
      p.style.transition = 'none';
      p.style.width = '0%';
      void p.offsetWidth;
    }

    function animateProgress(tab) {
      const p = tab.querySelector('.tab-progress');
      if (!p) return;
      resetProgress(tab);
      requestAnimationFrame(() => {
        p.style.transition = `width ${AUTOPLAY_DURATION}ms linear`;
        p.style.width = '100%';
      });
    }

    function goToNextTab() {
      if (!isInView) return;
      const i = tabs.indexOf(getCurrentTab());
      if (i < 0) return;
      tabs[(i + 1) % tabs.length].click();
    }

    function startAutoplay() {
      if (!isInView) return;
      clearAutoplay();
      timer = setTimeout(goToNextTab, AUTOPLAY_DURATION);
    }

    function handleTabActivated() {
      const current = getCurrentTab();
      if (!current) return;
      tabs.forEach(t => { if (t !== current) resetProgress(t); });
      if (isInView) {
        animateProgress(current);
        startAutoplay();
      }
    }

    tabs.forEach(tab => {
      new MutationObserver(() => {
        if (tab.classList.contains('w--current')) handleTabActivated();
      }).observe(tab, { attributes: true, attributeFilter: ['class'] });

      tab.addEventListener('click', () => {
        if (!isInView) return;
        clearAutoplay();
        requestAnimationFrame(handleTabActivated);
      });
    });

    new IntersectionObserver(entries => {
      entries.forEach(entry => {
        isInView = entry.isIntersecting;
        if (isInView) handleTabActivated();
        else {
          clearAutoplay();
          const current = getCurrentTab();
          if (current) resetProgress(current);
        }
      });
    }, { threshold: 0.2 }).observe(container);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.w-tabs').forEach(initTabSection);
  });
})();




(function () {
  function init() {
    var body = document.body;
    var rows = Array.prototype.slice.call(
      document.querySelectorAll(".expertise_row")
    );
    if (rows.length < 2) return;

    var clamp = function (v) {
      return Math.min(1, Math.max(0, v));
    };

    var items = [];

    rows.forEach(function (row, i) {
      row.style.zIndex = i + 1;
      var next = rows[i + 1];
      if (!next) return;

      items.push({
        row: row,
        next: next,
        shade: row.querySelector(".expertise_shade"),
        start: 0,
        end: 1
      });
    });

    /* Layout position of an element relative to the body scroll
       content, measured with transforms cleared so it stays stable. */
    function topOf(el) {
      return el.getBoundingClientRect().top + body.scrollTop;
    }

    function measure() {
      var vh = window.innerHeight;

      /* Clear transforms so measurements are not skewed */
      items.forEach(function (it) {
        it.row.style.transform = "none";
      });

      items.forEach(function (it) {
        it.start = topOf(it.row);                 // "top top"
        it.end = topOf(it.next) - vh * 0.35;      // next "top 35%"
        if (it.end <= it.start) it.end = it.start + 1;
      });

      /* Re-apply current progress */
      update();
    }

    function update() {
      var y = body.scrollTop;
      var shift = window.innerWidth * 0.08;       // 8vw

      items.forEach(function (it) {
        var p = clamp((y - it.start) / (it.end - it.start));

        it.row.style.transform =
          "translate3d(0," + (shift * p) + "px,0)";

        if (it.shade) {
          it.shade.style.opacity = String(0.6 * p);
        }
      });
    }

    var ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        update();
      });
    }

    body.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    var lastW = window.innerWidth;
    var resizeTimer;
    window.addEventListener("resize", function () {
      /* Ignore mobile toolbar height changes, re-measure on width change */
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(measure, 150);
    });

    window.addEventListener("load", function () {
      requestAnimationFrame(measure);
      setTimeout(measure, 500);
    });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        requestAnimationFrame(measure);
      });
    }

    measure();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();






  const swiperMulti = new Swiper('.swiper-container', {
    slidesPerView: 'auto',
    centeredSlides: true,
    loop: true,
    speed: 800,
    spaceBetween: 40,

    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },

    pagination: {
      el: '.swiper-pagination',
      clickable: true,
    },

    breakpoints: {
      480: {
        spaceBetween: 10
      },
      768: {
        spaceBetween: 25
      }
    }
  });
