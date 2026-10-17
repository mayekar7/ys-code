<style>
.u-native-services_bg-img,
.u-native-services_bg-img-1{
  background-position:center;
  background-size:cover;
  background-repeat:no-repeat;
}

.u-native-services_section{
  padding-top:6rem;
  background:#FFFEFC;
  color:#242424;
  overflow:clip;
}

.u-native-services_track{
  height:450vh;
  position:relative;
}

.u-native-services_pin{
  position:sticky;
  top:0;
  width:100%;
  height:100vh;   /* fallback */
  height:100svh;  /* stable on mobile, ignores toolbar show/hide */
  overflow:visible;
}

.u-native-services_stage{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  transform:scale(.2);
  transform-origin:50% 50%;
  will-change:transform;
  backface-visibility:hidden;
  -webkit-backface-visibility:hidden;
}

/* Content block scales 1 → 1.1 in sync with the stage scale (driven from JS) */
.u-content-block{
  transform:scale(1);
  transform-origin:50% 50%;
  will-change:transform;
  backface-visibility:hidden;
  -webkit-backface-visibility:hidden;
}

/* Continuous values (scale, parallax) are smoothed in JS.
   Discrete changes (fades, card slide, stack growth) are smoothed here. */
.u-native-services_bg-img,
.u-native-services_bg-img-1{
  will-change:transform,opacity;
  transition:opacity .9s cubic-bezier(.4,0,.2,1);
}

.u-native-services_card{
  transition:opacity .6s cubic-bezier(.4,0,.2,1);
}

.u-native-services_col{
  will-change:transform;
  transition:transform .9s cubic-bezier(.22,.61,.36,1);
}

.u-native-services_stack{
  transition:height .8s cubic-bezier(.22,.61,.36,1);
}

@media(max-width:809px){
  .u-native-services_section{padding-top:4rem}
  .u-native-services_track{height:400vh}
  .u-native-services_section .section-head{padding-left:1.25rem;padding-right:1.25rem}
  .u-native-services_col{gap:5rem}
}

@media(prefers-reduced-motion:reduce){
  .u-native-services_bg-img,
  .u-native-services_bg-img-1,
  .u-native-services_card,
  .u-native-services_col,
  .u-native-services_stack{transition:none}
}
</style>


<script>
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
    var imgs = [img1, others[0], others[1]];

    var body = document.body;

    var missing = [];
    if (!track) missing.push("track");
    if (!stage) missing.push("stage");
    if (!stack) missing.push("stack");
    if (!col) missing.push("col");
    if (!cards.length) missing.push("cards");

    imgs.forEach(function (im, i) {
      if (!im) missing.push("bg image " + (i + 1));
    });

    if (missing.length) {
      console.warn(
        "[native-services] Missing elements, animation disabled:",
        missing.join(", ")
      );
      return;
    }

    var reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var SMOOTHING = 10;
    var HEIGHTS = ["0%", "15%", "100%", "100%", "100%"];

    var CONTENT_SCALE_START = 1;
    var CONTENT_SCALE_END = 1.1;

    var clamp = function (v) {
      return Math.min(1, Math.max(0, v));
    };

    var stageH = stage.offsetHeight;
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
    var running = false;
    var lastTime = 0;

    /*
      Measure the track's absolute starting position
      relative to the BODY scroll position.
    */
    function measure() {
      stageH = stage.offsetHeight;

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

      if (k !== last || complete !== lastComplete) {
        last = k;
        lastComplete = complete;

        stack.style.height = HEIGHTS[k] || "100%";

        var a = k - 2;
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

        var bgIndex =
          complete && a >= 0
            ? Math.min(2, a)
            : 0;

        for (var m = 0; m < imgs.length; m++) {
          imgs[m].style.opacity =
            m === bgIndex ? "1" : "0";
        }
      }

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
</script>

<script>
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
</script>


<!-- EXPERTISE ROWS (manual body-scroll driven, no ScrollTrigger) -->
<script>
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
</script>


<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>

<script>
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
</script>