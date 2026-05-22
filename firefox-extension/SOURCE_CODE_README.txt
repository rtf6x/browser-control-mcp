Browser Control MCP (Personal) — source code for AMO review
Version: 1.5.2

Requirements
- Node.js 18 or newer
- npm

Directory layout
- firefox-extension/  — add-on source (TypeScript, HTML, manifest)
- common/               — shared message types (local dependency)

Build instructions
1. cd firefox-extension
2. npm install
3. npm run build

Expected output
- dist/background.js  (bundled from background.ts and dependencies)
- dist/options.js     (bundled from options.ts and dependencies)

Pack XPI (optional verification)
- npm run pack-xpi
- Creates ../browser-control-mcp-dev.xpi with: manifest.json, dist/, options.html, assets/

Build tool
- esbuild 0.25.1 (bundle + TypeScript compile, no --minify)
- Command: esbuild background.ts --bundle --outfile=dist/background.js
          esbuild options.ts --bundle --outfile=dist/options.js

Notes
- HTML/CSS (options.html) are not processed by a build tool.
- No runtime npm dependencies are bundled into the XPI; only esbuild output is shipped.
- Tests (optional): npm test
