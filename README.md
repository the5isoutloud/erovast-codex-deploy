# Erovast Codex

The Erovast Codex is the campaign record for our D&D game. It has two parts:

- **`Erovast Vault/`**: an [Obsidian](https://obsidian.md) vault holding all campaign notes, including session logs, locations, characters, NPCs, factions and quests.
- **`site/`**: a [Hugo](https://gohugo.io) website that publishes the vault as a browsable, dark-themed site.

Hugo runs **only inside Docker**, using the [`hugomods/hugo:go-git`](https://hub.docker.com/r/hugomods/hugo) image. Nobody needs to install Hugo or Go.

---

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine with the Compose plugin)
- [Obsidian](https://obsidian.md) for editing notes (optional; the notes are plain Markdown)
- Git

## Getting started

```sh
git clone <repo-url> erovast-codex-deploy
cd erovast-codex-deploy
docker compose up
```

Open **<http://localhost:1313>**. The preview reloads automatically when you save a note, `site/hugo.toml`, or a template. Press `Ctrl+C` to stop it, or run `docker compose up -d` to keep it running in the background and `docker compose down` to stop it.

The first run downloads the Docker image, which takes a minute. Later runs start in seconds.

## Building the website

```sh
docker compose run --rm build
```

This writes the finished static website to **`site/public/`**. Upload that folder to any static host: GitHub Pages, Netlify, Cloudflare Pages, S3, or a plain web server. Before publishing for real, set `baseURL` at the top of `site/hugo.toml` to the site's address.

`site/public/` is generated output and is ignored by Git.

## Editing notes

Open `Erovast Vault/` as a vault in Obsidian and write as usual. The site understands wikilinks (`[[Note]]`, `[[Note|text]]`, `[[Note#Heading]]`), image embeds (`![[image.png|300]]`), note embeds, callouts, highlights, `%% comments %%` and tags. See [`site/THEME.md`](site/THEME.md#7-obsidian-features-that-are-supported) for the full list.

Conventions the site relies on:

| Convention | Why |
|---|---|
| Top-level folders are numbered: `00 - Game Log`, `01 - Locations in Erovast`, … | The number sets the sidebar order and is hidden on the site. |
| Images go in `Attachments/` | That folder is never shown as a section. Images are found by file name, so they can live anywhere, but keep them together. |
| Session logs are named `YYYY.MM.DD` | The Game Log is listed newest-first, and the landing page's "Latest session" button uses that order. |
| `Transcripts/` folders are not published | They're used by a separate process. Links to them show as plain text on the site. |
| Put a `title:` in front matter if the display name should differ from the file name | Otherwise the file name is used. |

Adding a new top-level folder (e.g. `06 - Items`) puts it in the sidebar automatically. To give it a card on the landing page, see [`site/THEME.md` §2](site/THEME.md#2-the-landing-page).

## Customizing the site

Colors, fonts, the landing page, sidebar naming and ordering, and page features are all set in **[`site/hugo.toml`](site/hugo.toml)**. **[`site/THEME.md`](site/THEME.md)** is the complete guide to changing the theme.

## Project layout

```
erovast-codex-deploy/
├── README.md              ← this file
├── docker-compose.yaml    ← `server` (live preview) and `build` services
├── Erovast Vault/         ← Obsidian vault (the content)
└── site/                  ← Hugo site (theme, config, landing page)
    ├── hugo.toml
    ├── THEME.md
    └── …
```

## Docker details

`docker-compose.yaml` mounts the **whole project** at `/project` inside the container and runs Hugo from `/project/site`. That's what lets the site read `../Erovast Vault` in place, without copying it. Hugo's module cache is kept in `~/.cache/docker_compose_hugo_cache` on your machine so later starts are faster.

To run any other Hugo command in the container:

```sh
docker compose run --rm build hugo <command>
# e.g.
docker compose run --rm build hugo version
docker compose run --rm build hugo list all
```

## Troubleshooting

- **Port 1313 is in use:** change `1313:1313` in `docker-compose.yaml` to e.g. `8080:1313`, then browse to <http://localhost:8080>.
- **A new sub-folder isn't in the sidebar:** restart the preview. Folders are detected when the server starts.
- **Something looks stale:** hard-refresh the browser (`Cmd/Ctrl+Shift+R`), or run `docker compose down && docker compose up`.

See [`site/THEME.md` §11](site/THEME.md#11-troubleshooting) for more.
