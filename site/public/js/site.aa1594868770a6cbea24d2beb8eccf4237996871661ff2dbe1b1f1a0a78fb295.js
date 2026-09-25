// Erovast Codex — sidebar behaviour.
// The sidebar HTML is identical on every page, so the current page is
// highlighted (and its folders expanded) here.
(function () {
  "use strict";

  var sidebar = document.getElementById("sidebar");
  if (!sidebar) return;

  var tree = document.getElementById("sidebar-tree");
  var toggle = document.getElementById("sidebar-toggle");
  var backdrop = document.getElementById("sidebar-backdrop");
  var filter = document.getElementById("sidebar-filter");

  function normalize(path) {
    try { path = decodeURI(path); } catch (e) { /* keep as is */ }
    return path.replace(/index\.html$/, "").replace(/\/?$/, "/");
  }

  // ---- Highlight the current page / folder and open its parents ----------
  var here = normalize(window.location.pathname);
  var active = null;

  tree.querySelectorAll(".tree-page a").forEach(function (a) {
    if (normalize(a.pathname) === here) active = a;
  });
  if (!active) {
    tree.querySelectorAll("details[data-folder]").forEach(function (d) {
      if (normalize(d.getAttribute("data-folder")) === here) active = d.querySelector("summary");
    });
  }
  if (active) {
    active.classList.add("is-active");
    active.setAttribute("aria-current", "page");
    for (var el = active.parentElement; el && el !== tree; el = el.parentElement) {
      if (el.tagName === "DETAILS") el.open = true;
    }
    if (active.tagName === "SUMMARY") active.parentElement.open = true;
    // Bring the active item into view inside the sidebar.
    var top = active.getBoundingClientRect().top - tree.getBoundingClientRect().top;
    if (top > tree.clientHeight - 60) tree.scrollTop = top - tree.clientHeight / 3;
  }

  // ---- Mobile open / close ------------------------------------------------
  function setOpen(open) {
    sidebar.classList.toggle("is-open", open);
    if (backdrop) backdrop.hidden = !open;
    if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (toggle) toggle.addEventListener("click", function () { setOpen(!sidebar.classList.contains("is-open")); });
  if (backdrop) backdrop.addEventListener("click", function () { setOpen(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });

  // ---- Filter box ---------------------------------------------------------
  if (filter) {
    var saved = {};
    filter.addEventListener("input", function () {
      var q = filter.value.trim().toLowerCase();
      var folders = tree.querySelectorAll("details");

      if (q && !Object.keys(saved).length) {
        folders.forEach(function (d, i) { saved[i] = d.open; });
      }

      tree.querySelectorAll(".tree-page").forEach(function (li) {
        var hit = !q || li.textContent.toLowerCase().indexOf(q) !== -1;
        li.classList.toggle("is-filtered-out", !hit);
      });

      // Deepest folders first, so a parent can see whether any child matched.
      Array.prototype.slice.call(folders).reverse().forEach(function (d) {
        var li = d.parentElement;
        var nameHit = q && d.querySelector("summary").textContent.toLowerCase().indexOf(q) !== -1;
        if (nameHit) {
          d.querySelectorAll(".is-filtered-out").forEach(function (x) { x.classList.remove("is-filtered-out"); });
        }
        var visible = !q || nameHit || d.querySelector(".tree-page:not(.is-filtered-out), .tree-folder:not(.is-filtered-out)");
        li.classList.toggle("is-filtered-out", !visible);
        if (q) d.open = !!visible;
      });

      if (!q) {
        folders.forEach(function (d, i) { if (i in saved) d.open = saved[i]; });
        saved = {};
      }
    });
  }
})();
