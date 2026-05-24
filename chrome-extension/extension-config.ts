/**
 * Configuration management for Browser Control MCP (Chrome)
 */

import { ServerMessageRequest } from "@browser-control-mcp/common/server-messages";
import { normalizeBrowserId } from "@browser-control-mcp/common/handshake-messages";
import {
  DEFAULT_WS_URL,
  portToWsUrl,
} from "@browser-control-mcp/common/ws-endpoints";
import { DEFAULT_WS_PORT } from "@browser-control-mcp/common/ports";
import { browser } from "./browser";
const AUDIT_LOG_SIZE_LIMIT = 100;

const PAGE_TOOLS_DISABLED_BY_DEFAULT = new Set([
  "evaluate-script-in-tab",
  "query-dom-in-tab",
  "get-console-messages-in-tab",
]);

export interface ToolInfo {
  id: string;
  name: string;
  description: string;
}

export const AVAILABLE_TOOLS: ToolInfo[] = [
  {
    id: "open-browser-tab",
    name: "Open Browser Tab",
    description: "Allows the MCP server to open new browser tabs",
  },
  {
    id: "close-browser-tabs",
    name: "Close Browser Tabs",
    description: "Allows the MCP server to close browser tabs",
  },
  {
    id: "get-list-of-open-tabs",
    name: "Get List of Open Tabs",
    description: "Allows the MCP server to get a list of all open tabs",
  },
  {
    id: "get-recent-browser-history",
    name: "Get Recent Browser History",
    description: "Allows the MCP server to access your recent browsing history",
  },
  {
    id: "get-tab-web-content",
    name: "Get Tab Web Content",
    description: "Allows the MCP server to read the content of web pages",
  },
  {
    id: "reorder-browser-tabs",
    name: "Reorder/Group Browser Tabs",
    description: "Allows the MCP server to reorder/group your browser tabs",
  },
  {
    id: "find-highlight-in-browser-tab",
    name: "Find and Highlight in Browser Tab",
    description: "Allows the MCP server to search for text in web pages",
  },
  {
    id: "evaluate-script-in-tab",
    name: "Evaluate Script in Tab",
    description: "Allows the MCP server to run JavaScript functions in web pages",
  },
  {
    id: "query-dom-in-tab",
    name: "Query DOM in Tab",
    description: "Allows the MCP server to query DOM elements (text, HTML, element lists)",
  },
  {
    id: "get-console-messages-in-tab",
    name: "Get Console Messages in Tab",
    description: "Allows the MCP server to read console output from web pages",
  },
];

export const COMMAND_TO_TOOL_ID: Record<ServerMessageRequest["cmd"], string> = {
  "open-tab": "open-browser-tab",
  "close-tabs": "close-browser-tabs",
  "get-tab-list": "get-list-of-open-tabs",
  "get-browser-recent-history": "get-recent-browser-history",
  "get-tab-content": "get-tab-web-content",
  "reorder-tabs": "reorder-browser-tabs",
  "find-highlight": "find-highlight-in-browser-tab",
  "group-tabs": "reorder-browser-tabs",
  "evaluate-script": "evaluate-script-in-tab",
  "query-dom": "query-dom-in-tab",
  "get-console-messages": "get-console-messages-in-tab",
};

export interface ToolSettings {
  [toolId: string]: boolean;
}

export interface AuditLogEntry {
  toolId: string;
  command: string;
  timestamp: number;
  url?: string;
}

export interface ExtensionConfig {
  secret?: string;
  browserId?: string;
  label?: string;
  toolSettings?: ToolSettings;
  domainDenyList?: string[];
  wsUrls?: string[];
  /** @deprecated Migrated to {@link wsUrls} on read. */
  ports?: number[];
  auditLog?: AuditLogEntry[];
}

function generateBrowserId(): string {
  return `browser-${crypto.randomUUID().slice(0, 8)}`;
}

export function getDefaultToolSettings(): ToolSettings {
  const settings: ToolSettings = {};
  AVAILABLE_TOOLS.forEach((tool) => {
    settings[tool.id] = !PAGE_TOOLS_DISABLED_BY_DEFAULT.has(tool.id);
  });
  return settings;
}

function migrateWsUrls(config: ExtensionConfig): boolean {
  if (config.wsUrls?.length) {
    if (config.ports !== undefined) {
      delete config.ports;
      return true;
    }
    return false;
  }

  if (config.ports?.length) {
    config.wsUrls = config.ports.map((p) =>
      portToWsUrl(p === 8089 ? DEFAULT_WS_PORT : p)
    );
    delete config.ports;
    return true;
  }

  config.wsUrls = [DEFAULT_WS_URL];
  return true;
}

export async function getConfig(): Promise<ExtensionConfig> {
  const configObj = await browser.storage.local.get("config");
  const config: ExtensionConfig = configObj.config || { secret: "" };

  config.toolSettings = {
    ...getDefaultToolSettings(),
    ...config.toolSettings,
  };

  let dirty = false;
  if (migrateWsUrls(config)) {
    dirty = true;
  }

  if (!config.browserId) {
    config.browserId = generateBrowserId();
    dirty = true;
  }

  if (dirty) {
    await saveConfig(config);
  }

  return config;
}

export async function saveConfig(config: ExtensionConfig): Promise<void> {
  await browser.storage.local.set({ config });
}

export async function getSecret(): Promise<string> {
  const config = await getConfig();
  return config.secret ?? "";
}

export async function getBrowserId(): Promise<string> {
  const config = await getConfig();
  return config.browserId!;
}

export async function getBrowserLabel(): Promise<string | undefined> {
  const config = await getConfig();
  return config.label;
}

export async function setBrowserIdentity(
  browserId: string,
  label?: string
): Promise<void> {
  const normalizedId = normalizeBrowserId(browserId);
  const config = await getConfig();
  config.browserId = normalizedId;
  config.label = label?.trim() || undefined;
  await saveConfig(config);
}

export async function isToolEnabled(toolId: string): Promise<boolean> {
  const config = await getConfig();
  return config.toolSettings?.[toolId] !== false;
}

export async function isCommandAllowed(
  command: ServerMessageRequest["cmd"]
): Promise<boolean> {
  const toolId = COMMAND_TO_TOOL_ID[command];
  if (!toolId) {
    console.error(`Unknown command: ${command}`);
    return false;
  }
  return isToolEnabled(toolId);
}

export async function setToolEnabled(
  toolId: string,
  enabled: boolean
): Promise<void> {
  const config = await getConfig();
  if (!config.toolSettings) {
    config.toolSettings = getDefaultToolSettings();
  }
  config.toolSettings[toolId] = enabled;
  await saveConfig(config);
}

export async function getAllToolSettings(): Promise<ToolSettings> {
  const config = await getConfig();
  return config.toolSettings || getDefaultToolSettings();
}

export async function getDomainDenyList(): Promise<string[]> {
  const config = await getConfig();
  return config.domainDenyList || [];
}

export async function setDomainDenyList(domains: string[]): Promise<void> {
  const config = await getConfig();
  config.domainDenyList = domains;
  await saveConfig(config);
}

export async function isDomainInDenyList(url: string): Promise<boolean> {
  try {
    const domain = new URL(url).hostname;
    const denyList = await getDomainDenyList();
    return denyList.some(
      (deniedDomain) =>
        domain.toLowerCase() === deniedDomain.toLowerCase() ||
        domain.toLowerCase().endsWith(`.${deniedDomain.toLowerCase()}`)
    );
  } catch {
    return false;
  }
}

export async function getWsUrls(): Promise<string[]> {
  const config = await getConfig();
  return config.wsUrls ?? [DEFAULT_WS_URL];
}

export async function setWsUrls(wsUrls: string[]): Promise<void> {
  const config = await getConfig();
  config.wsUrls = wsUrls;
  delete config.ports;
  await saveConfig(config);
}

export async function addAuditLogEntry(entry: AuditLogEntry): Promise<void> {
  const config = await getConfig();
  if (!config.auditLog) {
    config.auditLog = [];
  }
  config.auditLog.unshift(entry);
  if (config.auditLog.length > AUDIT_LOG_SIZE_LIMIT) {
    config.auditLog = config.auditLog.slice(0, AUDIT_LOG_SIZE_LIMIT);
  }
  await saveConfig(config);
}

export async function getAuditLog(): Promise<AuditLogEntry[]> {
  const config = await getConfig();
  return config.auditLog || [];
}

export async function clearAuditLog(): Promise<void> {
  const config = await getConfig();
  config.auditLog = [];
  await saveConfig(config);
}

export function getToolNameById(toolId: string): string {
  const tool = AVAILABLE_TOOLS.find((t) => t.id === toolId);
  return tool ? tool.name : toolId;
}
