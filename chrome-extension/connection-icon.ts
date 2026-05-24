import { browser } from "./browser";
import type { ConnectionStatus } from "@browser-control-mcp/common/websocket-client";

const ICONS: Record<ConnectionStatus, string> = {
  connected: "connected",
  connecting: "connecting",
  disconnected: "disconnected",
};

const TITLES: Record<ConnectionStatus, string> = {
  connected: "Browser Control MCP — connected to MCP server",
  connecting: "Browser Control MCP — connecting…",
  disconnected: "Browser Control MCP — MCP server offline",
};

function iconPath(name: string, size: 16 | 32 | 48): string {
  return browser.runtime.getURL(`assets/icons/${name}-${size}.png`);
}

export async function updateConnectionIcon(
  status: ConnectionStatus
): Promise<void> {
  const icon = ICONS[status];
  try {
    await browser.action.setIcon({
      path: {
        16: iconPath(icon, 16),
        32: iconPath(icon, 32),
        48: iconPath(icon, 48),
      },
    });
    await browser.action.setTitle({ title: TITLES[status] });
  } catch (error) {
    console.warn("Browser Control MCP: failed to update toolbar icon", error);
  }
}
