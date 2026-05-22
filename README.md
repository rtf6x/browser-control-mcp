# Browser Control MCP (Personal)

Personal fork of [Browser Control MCP](https://github.com/eyalzh/browser-control-mcp) — an MCP server paired with a Firefox extension that lets AI assistants work with your browser locally.

**Not affiliated** with the [official AMO add-on](https://addons.mozilla.org/en-US/firefox/addon/browser-control-mcp/). This fork uses a separate extension ID (`browser-control-mcp-personal@rtf6x.local`) and adds HTTP transport for [OpenCode](https://opencode.ai), Docker deployment, and extra page-inspection tools.

## What it does

- **Tabs** — open, close, list, reorder, group
- **History** — search recent browsing history
- **Pages** — read text/links, find/highlight, run JS, query DOM, read console output (with per-domain consent)
- **Local-only** — WebSocket + shared secret between extension and MCP server; no cloud backend

## Architecture

```
┌─────────────┐     MCP (stdio)      ┌──────────────┐
│ Claude      │◄────────────────────►│              │
│ Desktop     │                      │  MCP Server  │
└─────────────┘                      │              │
                                     │  :8090 HTTP  │◄── OpenCode (remote MCP)
┌─────────────┐     ws://:8089       │  :8089 WS    │
│ Firefox     │◄────────────────────►│              │
│ Extension   │                      └──────────────┘
└─────────────┘
```

| Component | Role |
|-----------|------|
| `firefox-extension/` | Runs in Firefox; WebSocket server on port 8089; executes browser actions |
| `mcp-server/` | MCP server; talks to the extension over WebSocket |
| `common/` | Shared TypeScript message types |

**Two MCP transports:**

| Transport | Entry point | Use with |
|-----------|-------------|----------|
| HTTP (Streamable HTTP) | `dist/http-server.js` (:8090) | OpenCode, remote MCP clients |
| stdio | `dist/server.js` | Claude Desktop, local MCP configs |

Port **8089** is the extension WebSocket — **not** MCP. Do not point OpenCode at `:8089`.

## MCP tools

All tools can be enabled or disabled individually in the extension options page (`about:addons` → Preferences). Tools marked **consent** require optional host permission and explicit per-domain approval in the extension UI.

| Tool | Description | Consent |
|------|-------------|---------|
| `open-browser-tab` | Open a URL in a new tab | — |
| `close-browser-tabs` | Close tabs by ID | — |
| `get-list-of-open-tabs` | List open tabs (paginated) | — |
| `get-recent-browser-history` | Search or list recent history | — |
| `reorder-browser-tabs` | Change tab order | — |
| `group-browser-tabs` | Create a tab group (title, color, collapse) | — |
| `get-tab-web-content` | Read page text and links (paginated for large pages) | **consent** |
| `find-highlight-in-browser-tab` | Find and highlight text on a page | **consent** |
| `evaluate-script-in-tab` | Run a JSON-serializable JS function in the page | **consent** |
| `query-dom-in-tab` | CSS selector → text, HTML, or element list | **consent** |
| `get-console-messages-in-tab` | Read `console.log/info/warn/error/debug` from a tab | **consent** |

The three page-inspection tools (`evaluate-script`, `query-dom`, `get-console-messages`) are **disabled by default** in extension settings.

### Example prompts

**Tab management**
- *"Close all tabs I haven't used in 24 hours."*
- *"Group my GitHub tabs into a group called Development."*

**History**
- *"Find articles about L-theanine in my browser history from the last week."*

**Research**
- *"Open HN, read the top story and summarize the comments."*
- *"On the open tab, run a DOM query for all `h2` headings and list them."*
- *"Check console errors on the current page."*

## Security model

Compared to full browser-automation MCP servers, this stack is designed for use with a personal browser:

- Local WebSocket only (`127.0.0.1`) with a random shared secret
- Per-tool toggles and an audit log in the extension options
- Host permissions and domain consent before reading or scripting pages
- No analytics or remote data collection (`data_collection_permissions: none`)
- No runtime third-party dependencies in the shipped extension

**Caution:** when page tools are enabled, the assistant can execute JavaScript and read page content on domains you approve. Review tool calls and keep sensitive tools disabled if you do not need them.

## Quick start (OpenCode + Docker)

Recommended setup: one persistent MCP container + Firefox extension on the host.

### 1. Build

```bash
npm install
npm run build
```

### 2. Install the Firefox extension

**Option A — signed XPI (persistent install)**

```bash
cd firefox-extension
npm run pack-xpi   # → ../browser-control-mcp-dev.xpi
```

Install the XPI in Firefox. After install, open extension preferences and copy the **shared secret**.

**Option B — temporary add-on (development)**

1. Open `about:debugging` → This Firefox → Load Temporary Add-on
2. Select `firefox-extension/manifest.json`
3. Copy the secret from the options page that opens

### 3. Configure environment

```bash
cp .env.example .env
# Set EXTENSION_SECRET to the value from the extension options page
```

### 4. Start MCP server in Docker

```bash
npm run docker:up
# or: docker compose up -d --build
```

Verify:

```bash
curl http://127.0.0.1:8090/health
npm run docker:logs
```

### 5. Configure OpenCode

Add to `~/.config/opencode/opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "browser-control": {
      "type": "remote",
      "url": "http://127.0.0.1:8090/mcp",
      "oauth": false,
      "enabled": true
    }
  }
}
```

Restart OpenCode (or reload MCP). The extension must be running in Firefox with port **8089** and the same secret as in `.env`.

## Installation (other clients)

### Claude Desktop (stdio)

Build the extension and MCP server, install the Firefox add-on, then add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "browser-control": {
      "command": "node",
      "args": ["/path/to/repo/mcp-server/dist/server.js"],
      "env": {
        "EXTENSION_SECRET": "<secret_from_extension_options>",
        "EXTENSION_PORT": "8089"
      }
    }
  }
}
```

For Claude Desktop you can also use the upstream [DXT package](https://github.com/eyalzh/browser-control-mcp/releases) with the official AMO extension — that path does not include this fork's extra tools or HTTP server.

### MCP server without Docker

```bash
cd mcp-server
cp ../.env .env   # or export EXTENSION_SECRET
npm run build
npm start         # HTTP on :8090
# npm run start:stdio   # stdio for Claude Desktop
```

### Manual Docker run

```bash
docker build -t browser-control-mcp .
docker run -d --name browser-control-mcp --restart unless-stopped \
  -p 127.0.0.1:8089:8089 \
  -p 127.0.0.1:8090:8090 \
  -e EXTENSION_SECRET=<secret_from_extension> \
  -e CONTAINERIZED=true \
  browser-control-mcp
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EXTENSION_SECRET` | — | Shared secret from extension options (required) |
| `EXTENSION_PORT` | `8089` | WebSocket port the extension listens on |
| `MCP_HTTP_PORT` | `8090` | HTTP MCP endpoint port |
| `CONTAINERIZED` | — | Set to `true` in Docker so HTTP binds to `0.0.0.0` |

## Commands

```bash
npm install              # install all packages
npm run build            # build extension + MCP server

# Firefox extension
cd firefox-extension && npm run build
cd firefox-extension && npm run pack-xpi
cd firefox-extension && npm test

# MCP server
cd mcp-server && npm start          # HTTP (default)
cd mcp-server && npm run start:stdio  # stdio

# Docker
npm run docker:up
npm run docker:down
npm run docker:logs
```

## Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| OpenCode: failed to get tools | Wrong URL or server not running | Use `http://127.0.0.1:8090/mcp`, not `:8089`. Check `curl …/health` |
| MCP can't connect to extension | Secret mismatch or extension inactive | Match `.env` secret with options page; reload extension |
| Port 8089 already in use | Multiple MCP instances | Stop extra containers/processes: `docker compose down`, kill stray `node dist/server.js` |
| Unknown command in extension | Old AMO build without new tools | Install this fork's XPI (v1.5.2+) |
| Page tools fail | Tool disabled or no domain consent | Enable tool in options; grant consent for the site |

After changing code or `.env`:

```bash
npm run build && npm run docker:up
```

Reload the Firefox extension if you changed extension code.

## Project layout

```
browser-control-mcp/
├── common/                 # Shared message types
├── firefox-extension/      # Firefox add-on (TypeScript → esbuild)
├── mcp-server/             # MCP server (TypeScript → tsc)
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

## Upstream

This fork is based on [eyalzh/browser-control-mcp](https://github.com/eyalzh/browser-control-mcp). The official project and [AMO listing](https://addons.mozilla.org/en-US/firefox/addon/browser-control-mcp/) are maintained separately.

**Fork additions:** HTTP MCP for OpenCode, Docker compose, `evaluate-script-in-tab`, `query-dom-in-tab`, `get-console-messages-in-tab`, personal extension ID.

## License

MIT (same as upstream). Use at your own risk — MCP tools can control your browser.
