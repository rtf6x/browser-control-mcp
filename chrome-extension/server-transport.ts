import type { ExtensionMessage } from "@browser-control-mcp/common/extension-messages";

/** Sends MCP responses back to the server (WebSocket or offscreen relay). */
export interface ServerTransport {
  sendResourceToServer(resource: ExtensionMessage): Promise<void>;
  sendErrorToServer(correlationId: string, errorMessage: string): Promise<void>;
}
