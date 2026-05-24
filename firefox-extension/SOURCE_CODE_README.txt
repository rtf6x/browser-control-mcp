Browser Control MCP (Personal) — source code for AMO review
Version: 1.6.0

Requirements
- Node.js 22 or newer (MCP server); Node.js 18+ for extension build
- npm

Directory layout
- firefox-extension/  — add-on source (TypeScript, HTML, manifest)
- common/             — shared types, WebSocket client, browserId handshake, wire envelope

Build instructions
1. cd firefox-extension
2. npm install
3. npm run build

Expected output
- dist/background.js  (esbuild bundle)
- dist/options.js     (esbuild bundle)

Pack XPI (optional verification)
- npm run pack-xpi
- Creates ../browser-control-mcp-dev.xpi and ../browser-control-mcp-firefox-source.zip (AMO source archive)

Source archive layout (browser-control-mcp-firefox-source.zip)
- SOURCE_CODE_README.txt  — this file, at archive root
- firefox-extension/      — add-on TypeScript sources (no node_modules, no dist/)
- common/                 — shared dependency sources (no node_modules, no dist/)

Build tool
- esbuild 0.25.1
- Commands: esbuild background.ts --bundle --outfile=dist/background.js
           esbuild options.ts --bundle --outfile=dist/options.js

Notes
- v1.6: extension registers browserId on WebSocket connect; localhost trust by default
- HTML/CSS (options.html) are not processed by a build tool
- esbuild bundles `common/` via the local `@browser-control-mcp/common` package (sources included in this archive)
- Tests (optional): npm test
