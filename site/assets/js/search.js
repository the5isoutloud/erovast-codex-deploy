// Erovast Codex — search.
// Bundled with Fuse.js by Hugo (js.Build). The index (search-index.<hash>.json)
// is only downloaded the first time search is opened, or when a search button
// is hovered/focused.
import Fuse from "./vendor/fuse.basic.min.mjs";

(function () {
  "use strict";

  var dialog = document.getElementById("search-dialog");
  if (!dialog || typeof dialog.showModal !== "function") return;

  var input = document.getElementById("search-input");
  var list = document.getElementById("search-results");
  var status = document.getElementById("search-status");
  var options = {};
  try { options = JSON.parse(dialog.getAttribute("data-options") || "{}"); } catch (e) { /* defaults */ }
  var weights = options.weights || {};
  var limit = options.limit || 12;
  var minLength = options.minLength || 2;

  var fuse = null;
  var loading = null;
  var results = [];
  var active = -1;
  var timer = 0;

  var isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  document.querySelectorAll("[data-search-shortcut]").forEach(function (el) {
    el.textContent = isMac ? "⌘K" : "Ctrl K";
  });

  // Curly quotes and straight quotes are treated as the same character.
  function norm(s) { return String(s || "").replace(/[’‘]/g, "'").replace(/[“”]/g, '"'); }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---- Loading ------------------------------------------------------------
  function load() {
    if (loading) return loading;
    loading = fetch(dialog.getAttribute("data-index"))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (items) {
        items.forEach(function (it) {
          it.t = norm(it.t); it.x = norm(it.x || "");
          it.a = (it.a || []).map(norm);
        });
        fuse = new Fuse(items, {
          keys: [
            { name: "t", weight: weights.t },
            { name: "a", weight: weights.a },
            { name: "g", weight: weights.g },
            { name: "f", weight: weights.f },
            { name: "x", weight: weights.x }
          ],
          threshold: options.threshold,
          ignoreLocation: true,      // match anywhere in long notes
          ignoreDiacritics: true,
          includeMatches: true,
          minMatchCharLength: minLength
        });
        if (input.value) search();
      })
      .catch(function () {
        loading = null;
        setStatus("Search couldn't load. Check your connection and try again.");
      });
    return loading;
  }

  // ---- Rendering ----------------------------------------------------------
  function setStatus(text) { status.textContent = text; status.hidden = !text; }

  // Wrap [start, end] index ranges of `text` (relative to `offset`) in <mark>.
  function highlight(text, ranges, offset) {
    offset = offset || 0;
    var out = "", pos = 0;
    ranges
      .map(function (r) { return [r[0] - offset, r[1] - offset]; })
      .filter(function (r) { return r[1] >= 0 && r[0] < text.length; })
      .sort(function (a, b) { return a[0] - b[0]; })
      .forEach(function (r) {
        var s = Math.max(r[0], pos), e = Math.min(r[1], text.length - 1);
        if (e < s) return;
        out += escapeHTML(text.slice(pos, s)) + "<mark>" + escapeHTML(text.slice(s, e + 1)) + "</mark>";
        pos = e + 1;
      });
    return out + escapeHTML(text.slice(pos));
  }

  // Ranges where the query (or its words) appear literally, case-insensitive.
  function literalRanges(text, query) {
    var lower = text.toLowerCase(), ranges = [];
    var terms = [query.toLowerCase()].concat(query.toLowerCase().split(/\s+/).filter(function (w) { return w.length >= minLength; }));
    terms.forEach(function (term) {
      var i = lower.indexOf(term);
      while (i !== -1 && ranges.length < 20) {
        ranges.push([i, i + term.length - 1]);
        i = lower.indexOf(term, i + term.length);
      }
    });
    return ranges;
  }

  function snippet(item, query, matches) {
    var text = item.x || "";
    if (!text) return "";
    var ranges = literalRanges(text, query);
    if (!ranges.length) {
      // Fall back to Fuse's fuzzy match positions: use the longest ones.
      matches.forEach(function (m) {
        if (m.key === "x") m.indices.forEach(function (r) { if (r[1] - r[0] + 1 >= Math.max(3, query.length - 2)) ranges.push(r); });
      });
    }
    var start = 0;
    if (ranges.length) {
      ranges.sort(function (a, b) { return a[0] - b[0]; });
      start = Math.max(0, ranges[0][0] - 60);
      var space = text.lastIndexOf(" ", start);
      if (start > 0 && space > start - 20) start = space + 1;
    }
    var end = Math.min(text.length, start + 200);
    var body = highlight(text.slice(start, end), ranges, start);
    return (start > 0 ? "…" : "") + body + (end < text.length ? "…" : "");
  }

  function render(query) {
    active = results.length ? 0 : -1;
    if (!results.length) {
      list.innerHTML = "";
      setStatus('No results for “' + query + '”.');
      return;
    }
    setStatus("");
    list.innerHTML = results.map(function (r, i) {
      var it = r.item;
      var titleRanges = [];
      var alias = "";
      (r.matches || []).forEach(function (m) {
        if (m.key === "t") titleRanges = m.indices;
        if (m.key === "a" && !alias) alias = it.a[m.refIndex];
      });
      var meta = [it.f].concat((it.g || []).map(function (g) { return "#" + g; })).filter(Boolean).join(" · ");
      return '<li role="option" id="search-opt-' + i + '"' + (i === 0 ? ' aria-selected="true" class="is-active"' : "") + ">" +
        '<a href="' + escapeHTML(it.u) + '">' +
          '<span class="search-result-title">' + highlight(it.t, titleRanges) +
            (alias && literalRanges(alias, query).length ? ' <span class="search-result-alias">(' + escapeHTML(alias) + ")</span>" : "") +
          "</span>" +
          (meta ? '<span class="search-result-meta">' + escapeHTML(meta) + "</span>" : "") +
          '<span class="search-result-snippet">' + snippet(it, query, r.matches || []) + "</span>" +
        "</a></li>";
    }).join("");
    input.setAttribute("aria-activedescendant", "search-opt-0");
  }

  function search() {
    var q = norm(input.value.trim());
    if (q.length < minLength) {
      results = []; list.innerHTML = "";
      setStatus(q ? "Keep typing…" : "Search names, places, factions, quests and session notes.");
      return;
    }
    if (!fuse) { setStatus("Loading…"); load(); return; }
    results = fuse.search(q, { limit: limit });
    render(q);
  }

  function move(delta) {
    var items = list.children;
    if (!items.length) return;
    if (active >= 0) { items[active].classList.remove("is-active"); items[active].removeAttribute("aria-selected"); }
    active = (active + delta + items.length) % items.length;
    items[active].classList.add("is-active");
    items[active].setAttribute("aria-selected", "true");
    input.setAttribute("aria-activedescendant", items[active].id);
    items[active].scrollIntoView({ block: "nearest" });
  }

  // ---- Open / close -------------------------------------------------------
  function open() {
    if (dialog.open) return;
    dialog.showModal();
    document.documentElement.classList.add("search-open");
    input.select();
    search();
    load();
  }
  function close() { if (dialog.open) dialog.close(); }

  dialog.addEventListener("close", function () { document.documentElement.classList.remove("search-open"); });
  // Click on the dimmed backdrop closes the dialog.
  dialog.addEventListener("click", function (e) { if (e.target === dialog) close(); });

  document.querySelectorAll("[data-search-open]").forEach(function (btn) {
    btn.addEventListener("click", open);
    btn.addEventListener("pointerenter", load, { once: true });
    btn.addEventListener("focus", load, { once: true });
  });
  document.querySelectorAll("[data-search-close]").forEach(function (btn) { btn.addEventListener("click", close); });

  input.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(search, 60); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") {
      var a = active >= 0 && list.children[active] && list.children[active].querySelector("a");
      if (a) { e.preventDefault(); window.location.href = a.href; }
    }
  });

  // A link like /?search=manticore opens search with that term filled in.
  var initial = new URLSearchParams(window.location.search).get("search");
  if (initial) { input.value = initial; open(); }

  // Keyboard shortcuts: Ctrl/⌘+K anywhere, or "/" when not typing.
  document.addEventListener("keydown", function (e) {
    if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      dialog.open ? close() : open();
      return;
    }
    if (e.key === "/" && !dialog.open) {
      var t = e.target;
      var typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (!typing) { e.preventDefault(); open(); }
    }
  });
})();
