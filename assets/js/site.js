/* Sakul Learning — progressive enhancement: scroll reveals + floating TOC.
   No dependencies. Everything degrades gracefully without JS. */
(function () {
  "use strict";

  // Safety net: if anything below throws, drop the opt-in class so the CSS
  // hidden state is removed and all content stays visible.
  window.addEventListener("error", function () {
    document.documentElement.classList.remove("reveal-enabled");
  });

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Staggered scroll reveal ------------------------------------------ */
  (function reveal() {
    var els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach(function (el, i) {
      el.style.setProperty("--reveal-delay", (i % 5) * 50 + "ms");
      io.observe(el);
    });
  })();

  /* ---- Floating table of contents with scrollspy ------------------------ */
  (function toc() {
    var article = document.querySelector(".post");
    if (!article) return;

    // Headings in the article body (kramdown emits ids via auto_ids).
    var headings = Array.prototype.filter.call(
      article.querySelectorAll("h2[id], h3[id]"),
      function (h) { return !h.closest("header"); }
    );
    if (headings.length < 2) return;

    var nav = document.createElement("nav");
    nav.className = "toc";
    nav.setAttribute("aria-label", "Table of contents");

    var label = document.createElement("p");
    label.className = "toc__label";
    label.textContent = "On this page";
    nav.appendChild(label);

    var rootList = document.createElement("ul");
    var linkFor = {};
    var currentH2Li = null; // most recent top-level item, to nest h3s under

    headings.forEach(function (h) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      linkFor[h.id] = a;

      if (h.tagName.toLowerCase() === "h3" && currentH2Li) {
        // nest under the parent h2; create its sublist on first child
        var sub = currentH2Li.querySelector(":scope > ul");
        if (!sub) { sub = document.createElement("ul"); currentH2Li.appendChild(sub); }
        sub.appendChild(li);
      } else {
        rootList.appendChild(li);
        if (h.tagName.toLowerCase() === "h2") currentH2Li = li;
      }
    });

    nav.appendChild(rootList);
    document.body.appendChild(nav);
    nav.classList.add("is-ready");

    /* Scrollspy: highlight the heading currently nearest the top. */
    var activeId = null;
    function setActive(id) {
      if (id === activeId || !linkFor[id]) return;
      if (activeId && linkFor[activeId]) {
        linkFor[activeId].classList.remove("is-active");
        linkFor[activeId].removeAttribute("aria-current");
      }
      linkFor[id].classList.add("is-active");
      linkFor[id].setAttribute("aria-current", "location");
      activeId = id;
    }

    if (!("IntersectionObserver" in window)) {
      setActive(headings[0].id);
      return;
    }

    var visible = {};
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting;
      });
      // First heading (document order) currently inside the top band wins;
      // if none are in the band, keep the last active heading.
      for (var i = 0; i < headings.length; i++) {
        if (visible[headings[i].id]) { setActive(headings[i].id); return; }
      }
    }, { rootMargin: "-72px 0px -70% 0px", threshold: 0 });

    headings.forEach(function (h) { spy.observe(h); });
    setActive(headings[0].id); // sensible default before first scroll
  })();
})();
