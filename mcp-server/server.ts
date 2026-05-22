import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { BrowserAPI } from "./browser-api";
import { createBrowserControlServer } from "./mcp-tools";

const browserApi = new BrowserAPI();
browserApi.init().catch((err) => {
  console.error("Browser API init error", err);
});

const mcpServer = createBrowserControlServer(browserApi);

const transport = new StdioServerTransport();
mcpServer.connect(transport).catch((err) => {
  console.error("MCP Server connection error", err);
  process.exit(1);
});

process.stdin.on("close", () => {
  browserApi.close();
  mcpServer.close();
  process.exit(0);
});
