# Erovast Codex Theme Guide

This guide explains how to customize the Erovast Codex website: the landing page, the sidebar, colors, fonts, and the templates behind them.

The theme was built from scratch for this project. It has no npm packages, no Sass, and no CSS framework. You control almost everything from **one file: [`hugo.toml`](hugo.toml)**. You only need to edit templates for structural changes.

> **Previewing changes:** run `docker compose up` from the project root and open <http://localhost:1313>. Most edits to `hugo.toml`, templates, CSS and vault notes reload the browser automatically. See the [root README](../README.md) for full setup instructions.

---

## Contents

1. [How the site is put together](#1-how-the-site-is-put-together)
2. [The landing page](#2-the-landing-page)
3. [The sidebar](#3-the-sidebar) (incl. [search](#search))
4. [Colors](#4-colors)
5. [Fonts and sizes](#5-fonts-and-sizes)
6. [Note pages](#6-note-pages)
7. [Obsidian features that are supported](#7-obsidian-features-that-are-supported)
8. [Images and other media](#8-images-and-other-media) (incl. [social share previews](#social-share-previews))
9. [Editing templates and CSS](#9-editing-templates-and-css) (incl. [caching](#caching))
10. [Moving or renaming the vault](#10-moving-or-renaming-the-vault)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. How the site is put together

```
erovast-codex-deploy/
├── Erovast Vault/            ← the Obsidian vault (the site reads it in place)
│   ├── 00 - Game Log/
│   ├── 01 - Locations in Erovast/
│   ├── …
│   └── Attachments/          ← images; never shown as a folder
└── site/                     ← the Hugo project
    ├── hugo.toml             ← ALL settings: colors, sidebar, landing page…
    ├── THEME.md              ← this file
    ├── content/
    │   ├── _index.md         ← landing page text
    │   └── _content.gotmpl   ← creates a page for every vault folder (don't edit)
    ├── assets/
    │   ├── css/main.css      ← the theme's styles
    │   ├── css/theme-vars.css← turns hugo.toml colors into CSS variables
    │   ├── css/chroma.css    ← code-block syntax colors (generated)
    │   └── js/site.js        ← sidebar behavior (highlight, filter, mobile menu)
    ├── layouts/              ← HTML templates (see section 9)
    ├── static/               ← files copied as-is (favicon, extra images)
    └── public/               ← the built website (generated; not committed)
```

**The vault is never copied.** `hugo.toml` has `[[module.mounts]]` entries that point Hugo at `../Erovast Vault`:

- every `.md` note becomes a page, and every folder becomes a section with its own listing page;
- every image, video, audio file and PDF can be linked from notes. Only the files a note actually uses are published;
- `Attachments/`, `.obsidian/`, `.trash/` and any `Transcripts/` folder are excluded from pages. The transcripts are used by a separate process, not the website. The vault's own `index.md` is skipped too, because the landing page lives in `site/content/_index.md` (see [section 10](#10-moving-or-renaming-the-vault) to use the vault's copy instead).

**URLs** are built from the real folder and file names, lower-cased with spaces turned into dashes. For example, `03 - NPCs/Holt.md` becomes `/03---npcs/holt/`. The numbers stay in the URL so that renaming a folder's display name never breaks links.

---

## 2. The landing page

The landing page has four parts, top to bottom:

| Part | Where to change it |
|---|---|
| Logo | `logo` in `[params]` |
| Title | `title:` in [`content/_index.md`](content/_index.md) (falls back to the site `title`) |
| Tagline | `tagline` in `[params.home]` |
| Welcome text | the body of [`content/_index.md`](content/_index.md). Write normal Markdown; `[[wikilinks]]` work too |
| "Latest session" button | `[params.home.latest]` |
| Search box (above the cards) | `[params.search]`, see [Search](#search) |
| Category cards | `[[params.home.cards]]` |

### Logo

```toml
[params]
  logo = "Erovast.png"          # a file name from the vault, found in any folder
  # logo = "/images/logo.svg"   # …or a file you put in site/static/images/
  favicon = ""                  # browser-tab icon; the logo is used if empty
```

The same logo appears in the sidebar header. To hide it on the landing page only, set `show_logo = false` under `[params.home]`.

### "Latest session" button

```toml
[params.home.latest]
  folder = "00 - Game Log"
  label = "Latest session"
```

This button links to the **first note in that folder, in sidebar order**. The Game Log is sorted newest-first (see `reverse_sort`), so the button always points at the most recent session. Delete the whole block to remove the button.

### Category cards

Each `[[params.home.cards]]` block adds one card, and cards appear in the order they're written. A card can point at a **folder**, a **note**, or any **URL**:

```toml
[[params.home.cards]]
  title = "NPCs"
  folder = "03 - NPCs"          # exact vault folder name (nested: "01 - Locations in Erovast/Everdale")
  description = "Allies, rivals, and everyone in between."
  icon = "🎭"                    # optional: an emoji or short text
  image = "Erovast.png"         # optional: vault image name or /static path; shown as a banner

[[params.home.cards]]
  title = "Everdale"
  note = "Everdale"             # a note's file name (no .md)

[[params.home.cards]]
  title = "Tags"
  url = "/tags/"
```

Folder cards show an entry count automatically. **If you delete every card block**, the site creates one card per top-level folder.

Change or hide the heading above the cards with `cards_heading` (set it to `""` to hide it).

The folder sidebar is hidden on the landing page. To show it there too, set `show_sidebar = true` under `[params.home]`.

---

## 3. The sidebar

On every page except the landing page, a sidebar shows the vault's folders as a collapsible tree. The folder holding the current page opens automatically and the page is highlighted. The number next to a folder is its entry count; click it to open that folder's listing page.

All sidebar settings live under `[params.sidebar]`:

```toml
[params.sidebar]
  strip_pattern = '^\d+\s*-\s*'      # removes "00 - ", "01 - " … from folder names
  strip_pages = false                # also strip it from note names?
  hidden = []                        # folders to hide, e.g. ["Drafts"]
  reverse_sort = ["00 - Game Log"]   # folders sorted Z→A (newest first for dated notes)
  open = []                          # folders expanded by default, e.g. ["Characters"]
  filter = true                      # the "Filter pages…" box

[params.sidebar.rename]
  "Locations in Erovast" = "Locations"
```

### Pinning a single note to the top

To show one note at the top of the sidebar, above all the folders and styled like a folder row, add a `[[params.sidebar.pinned]]` block:

```toml
[[params.sidebar.pinned]]
  note = "Campaign Synopsis"   # the note's file name (or "Folder/Note")
  title = "Synopsis"           # the label shown; defaults to the note's name
```

Pinned notes appear in the order their blocks are listed, and they're removed from their usual place in the tree. A pinned note can also have a card on the landing page: use `note = "…"` in a `[[params.home.cards]]` block (see [Category cards](#category-cards)).

### How folder names are displayed

For each folder, the site works through these steps in order:

1. If `[params.sidebar.rename]` has an entry for the **full** name (`"01 - Locations in Erovast"`) or the **stripped** name (`"Locations in Erovast"`), that entry is used.
2. Otherwise `strip_pattern` is removed from the start of the name. `01 - Locations in Erovast` becomes `Locations in Erovast`.

Display names are also used in breadcrumbs, folder pages and page titles.

> `hidden` only hides a folder from the sidebar and folder listings; its notes are still published. To leave a folder out of the site entirely, as is done for `Transcripts/`, add a `"! <folder>/**"` line to the `files` list of **both** vault note mounts in `hugo.toml` (the `content` mount and the `assets/vault-notes` mount).

### Ordering

- Folders are listed first, then notes.
- Both are sorted by their **real** file or folder name, so the `00 -`, `01 -` numbers control the order even though they're hidden.
- Folders in `reverse_sort` list their contents Z→A. The Game Log's `2026.09.15`-style names therefore appear newest first. Previous/Next links at the bottom of each note follow the same order.

**Adding a new top-level category:** create a folder in the vault such as `06 - Items`. It appears in the sidebar as "Items" immediately. Add a `[[params.home.cards]]` block if you want a card for it on the landing page.

### Changing the strip pattern

`strip_pattern` is a regular expression (Go syntax). Some examples:

| Folder names like | Pattern |
|---|---|
| `01 - Name` (default) | `'^\d+\s*-\s*'` |
| `01. Name` or `01_Name` | `'^\d+[\s._-]*'` |
| `[01] Name` | `'^\[\d+\]\s*'` |

Use single quotes in TOML so the backslashes are kept as written.

> The default pattern needs a dash, so date-named notes like `2026.05.05` are left alone if you turn on `strip_pages`.

---

### Search

Every page has search. It appears as a large box above the cards on the landing page, and at the top left beside the sidebar on other pages. On phones it's the magnifier icon in the top bar. It opens a pop-up that searches note titles, aliases, tags, folder names and the full text of notes. Search is also opened by:

- **`Ctrl`+`K`** (Windows/Linux) or **`⌘`+`K`** (Mac), from anywhere;
- **`/`**, when you're not typing in a box;
- **a link with `?search=`**, e.g. `https://erovast.com/?search=manticore`. It opens with that search already filled in, which is handy for sharing.

In the pop-up, use `↑`/`↓` to choose a result, `Enter` to open it, and `Esc` to close.

Matching is **fuzzy**, so misspellings still find the right note: "griselda" finds *Gruvelda Duskbelt*. Curly and straight apostrophes count as the same, and accents are ignored.

```toml
[params.search]
  enable = true                  # false removes search from the whole site
  placeholder = "Search the codex…"
  include_text = true            # false = only titles, aliases, tags and folders
  max_results = 12
  min_length = 2                 # characters typed before searching starts
  threshold = 0.35               # 0 = exact spelling … 1 = matches anything
  [params.search.weights]        # how much each field counts toward ranking
    title = 3
    aliases = 2
    tags = 1.5
    folder = 0.5
    text = 1
```

- **Too many loose matches?** Lower `threshold` to about `0.25`. **Typos not being caught?** Raise it to about `0.45`.
- **Names should win over passing mentions:** raise `title` and `aliases`, or lower `text`.

How it works: every build writes a search index file, `search-index.<hash>.json`, containing each note's name, aliases, tags, folder, URL and plain text. The browser only downloads it the first time someone opens search, or hovers over a search box. The index is about 270 KB, and the server compresses it to much less. [Fuse.js](https://www.fusejs.io) 7.5.0 does the fuzzy matching. It's stored in the project (`assets/js/vendor/`), so there's no outside service involved. Excluded folders such as `Transcripts/` aren't in the index.

The sidebar's **Filter pages…** box is separate from search. It only narrows the sidebar tree by note name.

## 4. Colors

The site is **dark mode only**. Every color is set in `[params.colors]` in `hugo.toml`, and any CSS color value works: `#hex`, `rgb()`, `rgba()`, `hsl()`, or a named color.

```toml
[params.colors]
  background = "#0f1115"
  accent     = "#d9a441"
  …
```

How it works: each key becomes a CSS variable named `--color-<key>`, with underscores turned into dashes. So `sidebar_active_bg` becomes `--color-sidebar-active-bg`. The stylesheet uses only these variables.

### What each color controls

| Key | Used for |
|---|---|
| **Page** | |
| `background` | Page background |
| `surface` | Cards, panels, properties box, previous/next buttons |
| `surface_hover` | Those elements on hover; embedded-note title bar |
| `border` | All borders and dividers |
| `selection` | Background of selected text |
| **Text** | |
| `text` | Body text |
| `text_muted` | Secondary text: breadcrumbs, counts, captions |
| `heading` | Headings `h1`–`h6` |
| `strong` | **Bold** and *italic* text |
| **Links & accents** | |
| `link` / `link_hover` | Links, including wikilinks |
| `link_broken` | Wikilinks to notes that don't exist (dashed underline) |
| `accent` | Buttons, list bullets, active borders, horizontal rules |
| `accent_text` | Text on top of `accent`, such as button labels |
| **Sidebar** | |
| `sidebar_bg` | Sidebar and mobile top bar background |
| `sidebar_text` | Note names in the sidebar |
| `sidebar_heading` | Folder names and the site title in the sidebar |
| `sidebar_hover_bg` | Hovered sidebar row |
| `sidebar_active_bg` / `sidebar_active` | Background and text of the current page's row |
| **Content** | |
| `blockquote_border` / `blockquote_bg` | `> quotes` |
| `code_bg` / `code_text` | `inline code` and code blocks |
| `table_header_bg` / `table_stripe_bg` | Table header row and alternating rows |
| `mark_bg` / `mark_text` | `==highlighted==` text |
| `tag_bg` / `tag_text` | `#tag` chips |
| **Callouts** | |
| `callout_note` | `[!note]`, `[!info]`, `[!abstract]` … |
| `callout_tip` | `[!tip]`, `[!success]`, `[!important]` … |
| `callout_warning` | `[!warning]`, `[!question]`, `[!todo]` … |
| `callout_danger` | `[!danger]`, `[!error]`, `[!bug]` … |
| `callout_quote` | `[!quote]`, `[!example]` |
| **Search** | |
| `search_overlay` | Dimmed layer behind the search pop-up (use a transparent color) |
| `search_active_bg` | The highlighted result (matches use `mark_bg` / `mark_text`) |
| **Landing page** | |
| `hero_glow` | Soft glow behind the logo (use a transparent color like `rgba(...)`) |
| `card_bg` / `card_hover_bg` / `card_border` / `card_title` | Category cards (also used for folder cards on listing pages) |

### Recipes

**Switch the gold accent to crimson:**

```toml
link = "#e05d5d"
link_hover = "#ff8080"
accent = "#c0392b"
accent_text = "#ffffff"
sidebar_active = "#ff8080"
sidebar_active_bg = "#2a1616"
tag_text = "#e05d5d"
hero_glow = "rgba(192, 57, 43, 0.2)"
```

**Add a new color of your own:** add a key, e.g. `quote_text = "#c9b8ff"`, then use `var(--color-quote-text)` anywhere in `assets/css/main.css`.

If you delete a key from `hugo.toml`, the fallback value at the top of `assets/css/main.css` is used instead.

### Code-block colors

Syntax highlighting in fenced code blocks uses a Chroma style set by `style` under `[markup.highlight]`. To change it, regenerate the stylesheet from the project root:

```sh
docker compose run --rm build hugo gen chromastyles --style=monokai > site/assets/css/chroma.css
```

Then set `style = "monokai"` in `hugo.toml` to match. The full list of styles is in the [Chroma style gallery](https://xyproto.github.io/splash/docs/).

---

## 5. Fonts and sizes

```toml
[params.fonts]
  fontsURL = "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Inter:wght@400;500;600&display=swap"
  heading  = "'Cinzel', Georgia, serif"
  body     = "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif"
  mono     = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
```

To change a font:

1. Pick one on [Google Fonts](https://fonts.google.com), click **Get embed code**, and copy the `https://fonts.googleapis.com/css2?...` address into `fontsURL`.
2. Put the font's name first in `heading` or `body`.

Set `fontsURL = ""` to load no web fonts and use only the fonts installed on each reader's machine.

**Self-hosting a font:** put the font files in `site/static/fonts/`, add an `@font-face` rule at the top of `assets/css/main.css`, and clear `fontsURL`.

```toml
[params.layout]
  sidebar_width  = "290px"   # desktop sidebar width
  content_width  = "860px"   # maximum width of the reading column
  base_font_size = "16px"    # scales all text (everything uses rem units)
  radius         = "8px"     # corner rounding of cards, code blocks, images
```

These become `--sidebar-width`, `--content-width`, `--base-font-size` and `--radius`.

---

## 6. Note pages

```toml
[params.page]
  backlinks   = true               # "Linked mentions" list at the bottom
  tags        = true               # #tag chips under the title
  breadcrumbs = true               # Home / Folder / Sub-folder
  properties  = ["status"]
  plain_text_links = ['(?i)transcript$']
```

- **Title:** a note's `title:` front matter is used, falling back to the file name. If the note begins with its own `# Heading`, the template doesn't add a second title.
- **Properties:** list any front matter fields to show in a small box under the title. Wikilinks inside them work. Fields that are empty are skipped.
- **Plain-text links:** wikilinks to notes that aren't on the site normally show as red "missing" links. If the target matches one of the regular expressions in `plain_text_links`, the link text is shown as ordinary text instead. The default makes the game logs' `Source: [[… - Transcript|Transcript]]` links plain text, because the transcripts are excluded.
- **Tags:** `tags:` front matter creates tag pages at `/tags/`, reachable from the "Browse tags" link at the bottom of the sidebar.
- **Linked mentions:** every other note containing a `[[wikilink]]` to this note, found by file name.
- **Previous / Next:** the neighboring notes in the same folder, in sidebar order.
- **`cssclasses`:** each class in a note's `cssclasses:` front matter is added to the page as `cc-<class>`. The theme already handles `wide-page`, which widens the reading column. Add your own rules in `main.css`, e.g. `.cc-my-class h2 { … }`.

---

## 7. Obsidian features that are supported

| Obsidian syntax | Result |
|---|---|
| `[[Note]]`, `[[Folder/Note]]` | Link to the note (found by file name, case-insensitive) |
| `[[Note\|Shown text]]` | Link with custom text (`\|` inside tables works too) |
| `[[Note#Heading]]`, `[[#Heading]]` | Link to a heading |
| `[[Alias]]` | Resolves through a note's `aliases:` front matter |
| `![[image.png]]`, `![[image.png\|300]]`, `![[image.png\|300x200]]` | Image, optionally sized |
| `![[clip.mp4]]`, `![[song.mp3]]`, `![[map.pdf]]` | Video / audio player / embedded PDF |
| `![[Note]]` | The other note's content, shown in a framed box (one level deep) |
| `<img src="../Attachments/x.png">` | Path fixed to point at the real file |
| `![alt](../Attachments/x.png)`, `![alt\|300](x.png)` | Standard Markdown image, found by file name |
| `[text](Other%20Note.md)` | Standard Markdown link to a note |
| `> [!note] Title`, `> [!tip]- Folded`, `> [!warning]+ Open` | Callouts (collapsible with `-` / `+`) |
| `==highlight==`, `~~strike~~` | Highlight / strikethrough |
| `%% hidden comment %%` | Removed from the site |
| Single line breaks | Kept as line breaks, as in Obsidian |
| Raw HTML (`<div style=…>`) | Kept as written |

Things to know:

- **Broken links** are shown in `link_broken` color with a dashed underline, and hovering one shows the missing name. Links matching `plain_text_links` are exempt (see [section 6](#6-note-pages)).
- Curly and straight apostrophes are treated as the same character, so `[[Le'Strange]]` finds `Le’Strange.md`.
- If two notes share a file name, `[[Name]]` links to the first one found. Use `[[Folder/Name]]` to be explicit.
- Not supported: Dataview queries, Canvas files, block-reference embeds (`![[Note#^id]]` becomes a link to the note), and Excalidraw.

---

## 8. Images and other media

Put media anywhere in the vault; `Attachments/` is the convention. Media is found **by file name**, the same way Obsidian finds it, so paths inside notes don't need to be correct. Only files that a note (or the logo or a card) actually uses are copied into `public/`, at `/vault/<original path>`.

Supported types: `png jpg jpeg gif webp svg avif bmp mp4 webm mov mp3 ogg wav m4a pdf`. To add another type, add its extension to the `files` list of the `assets/vault` mount in `hugo.toml`, and to the lists in `layouts/_partials/obsidian/render.html` and `layouts/_partials/obsidian/embed.html`.

Files for the site itself, not the vault (a favicon, a custom logo), go in `site/static/`. They're served from the site root, so `site/static/favicon.png` becomes `/favicon.png`.

---

### Social share previews

When a link is posted to Discord, Facebook, X, Slack, iMessage and similar apps, they show a preview card with an image, title and description. The site provides these through Open Graph and X/Twitter tags in each page's `<head>`. The settings are in `[params.social]`:

```toml
[params.social]
  image = ""               # default image; empty = use the logo
  poster = true            # fit images into a 1200×630 poster
  background = "#0f1115"   # poster background color
  page_images = true       # notes use their own first image
  twitter = ""             # optional X account, e.g. "@erovast"
```

- **Which image is used**, in order:
  1. `social_image: "file.png"` in a note's front matter;
  2. the note's first image, e.g. a character portrait (when `page_images = true`);
  3. `image` in `[params.social]`;
  4. the logo.
- **Posters:** Hugo fits the image inside 1200×630, the size social sites expect. It centers the image on `background` and saves it as a small JPEG, around 100 KB. Nothing is cropped, so tall portraits get dark bars at the sides.
- **Using your own designed image:** make it exactly 1200×630 and put it in `site/assets/images/` (or the vault). Set `image = "images/social.png"` (or its vault file name) and `poster = false`.
- **Title and description:** the page name, plus a description. The description is the note's `description:` front matter if set, otherwise the first ~180 characters of its text with wikilinks and formatting removed. The landing page and folder pages use `description` from `[params]`.
- **`baseURL` must be the real address** (`https://erovast.com/`). Social sites fetch the image from that full URL.
- **Checking a preview:** after publishing, paste a URL into [opengraph.xyz](https://www.opengraph.xyz) or the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/). Discord and Facebook cache previews. If an old preview sticks, use the debugger's **Scrape Again** button; for Discord, add `?v=2` to the end of the URL.

Processed images are cached in `site/resources/_gen/`, which is git-ignored and rebuilt automatically.

---

## 9. Editing templates and CSS

Templates use Hugo's Go template language ([docs](https://gohugo.io/templates/)). Here's what each file does:

| File | Renders |
|---|---|
| `layouts/baseof.html` | The page shell: `<head>`, mobile top bar, sidebar, footer |
| `layouts/home.html` | Landing page |
| `layouts/page.html` | A single note |
| `layouts/section.html` | A folder's listing page |
| `layouts/taxonomy.html`, `layouts/term.html` | `/tags/` and `/tags/<tag>/` |
| `layouts/404.html` | "Page not found" |
| `_partials/head.html` | `<title>`, fonts, CSS bundle, share-preview tags |
| `_partials/social-image.html`, `_partials/description.html` | Share-preview image (poster) and description |
| `_partials/plain-text.html` | A note's text as plain text (used by descriptions and search) |
| `_partials/search-trigger.html`, `search-dialog.html`, `search-index.html` | Search button, pop-up, and index file |
| `assets/js/search.js` (+ `assets/js/vendor/fuse.basic.min.mjs`) | Search behavior, bundled with Fuse.js by Hugo |
| `_partials/sidebar.html`, `_partials/sidebar-tree.html` | The sidebar and folder tree |
| `_partials/folder-name.html` | Folder display-name rules (strip + rename) |
| `_partials/page-name.html` | Display name for any page |
| `_partials/sorted-folders.html`, `_partials/sorted-pages.html` | Sidebar ordering |
| `_partials/breadcrumbs.html`, `tags.html`, `properties.html`, `backlinks.html`, `prev-next.html`, `footer.html` | Pieces of a note page |
| `_partials/obsidian/render.html` | **Converts Obsidian Markdown to HTML** (wikilinks, embeds, comments, media paths) |
| `_partials/obsidian/embed.html` | `![[...]]` embeds |
| `_partials/link-index.html`, `resolve-note.html` | Finding a note by name |
| `_partials/media-index.html`, `resolve-media.html`, `logo-url.html` | Finding a media file by name |
| `_markup/render-link.html`, `render-image.html`, `render-blockquote.html`, `render-heading.html` | Standard Markdown links, images, callouts, heading anchors |

**CSS:** `assets/css/main.css` is plain CSS, organized in labeled sections (Sidebar, Prose, Callouts, Cards, Home page, Mobile…). Always use the color variables rather than hard-coded colors, so everything stays controllable from `hugo.toml`. The mobile layout, with the slide-out sidebar, applies below 900px wide; see the `@media (max-width: 900px)` block at the end.

**Footer text:** set `footer` under `[params]` (Markdown allowed).

**Why no Bootstrap?** CSS custom properties give the same "change any color in config" ability without a 200 KB framework or a Sass build step. Bootstrap's own theming needs Sass to recompile, or dozens of `--bs-*` overrides. Plain CSS keeps every style in one readable file.

---

### Caching

Browsers and CDNs keep copies of files to load pages faster. That's great for readers, but it can hide your changes. The site is set up so that stale copies can't happen:

- **CSS, JavaScript, images and the search index have fingerprinted URLs.** Each URL contains a hash of the file's contents, e.g. `site.2c23af….css` or `Aldrich.fedb13….png`. When a file changes, its URL changes too, so a browser can never show an old version. This also covers replacing an image in the vault under the same file name. It applies to preview and the published site alike (`head.html`, `baseof.html`, `media-index.html`).
- **The preview server (`docker compose up`) sends `Cache-Control: no-store`** on every response, so a normal reload always gets the latest files. This is the `[server]` block at the top of `hugo.toml`, and it doesn't affect the published site.
- **HTML pages** can't be fingerprinted, because their addresses must stay the same. The host decides how long browsers keep them. After a publish, a normal reload usually shows the new page. If one doesn't, a hard refresh (`Cmd/Ctrl+Shift+R`) always will. Because every page points at fingerprinted CSS and JS, a refreshed page never mixes old styles with new content.

Nothing needs to be done by hand. Don't change the templates to link CSS, JS or images directly (`/css/main.css`, `/vault/...`); always go through `resources.Get` / `fingerprint` as the existing templates do.

## 10. Moving or renaming the vault

The vault path appears in **three mounts** in `hugo.toml`: search for `../Erovast Vault` and update all three. Paths are relative to the `site/` folder. The vault must stay **inside the project folder**, because Docker only mounts the project folder.

**Using the vault's `index.md` as the landing page** (so it can be edited in Obsidian): delete `site/content/_index.md`, remove the `"! index.md"` line from the content mount, and add this mount:

```toml
[[module.mounts]]
  source = "../Erovast Vault/index.md"
  target = "content/_index.md"
```

---

## 11. Troubleshooting

| Problem | Fix |
|---|---|
| A new **nested** folder doesn't appear | Restart the preview (`Ctrl+C`, then `docker compose up`). New folders are detected when the server starts. |
| Changes don't show up in preview | The preview disables browser caching (see [Caching](#caching)), so a stale page usually means the rebuild failed. Check `docker compose logs -f server` for an error. A new nested folder also needs a restart. |
| Published site shows an old page | Hard-refresh (`Cmd/Ctrl+Shift+R`); the host may cache HTML briefly. CSS, JS and images are never stale (see [Caching](#caching)). |
| Search says it couldn't load | The search index file didn't download. Reload the page; if it persists, check the build finished without errors. |
| A link shows up red and dashed | The target note doesn't exist under that name. Check the spelling, or hover the link to see what's missing. |
| An image doesn't show | Check the file's extension is in the supported list ([section 8](#8-images-and-other-media)) and the name matches exactly, including spaces. |
| `hugo.toml` error on start | TOML is strict: strings need quotes, and each `[[params.home.cards]]` block needs its own header line. The error message gives the line number. |
| Port 1313 already in use | Stop the other process, or change the left number in `ports:` in `docker-compose.yaml` (e.g. `8080:1313`) and browse to that port. |
