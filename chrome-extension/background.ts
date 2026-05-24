import { createWebsocketClient } from "./client";
import { MessageHandler } from "./message-handler";
import type { WebsocketClient } from "./client";
import { browser } from "./browser";
import { getConfig } from "./extension-config";

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    void browser.runtime.openOptionsPage();
  }
});

const RECONNECT_ALARM = "browser-control-mcp-reconnect";
const clients: WebsocketClient[] = [];

function initClient(
  wsUrl: string,
  browserId: string,
  secret: string,
  label?: string
) {
  const wsClient = createWebsocketClient(wsUrl, browserId, secret, label, "chrome");
  const messageHandler = new MessageHandler(wsClient);

  wsClient.connect();

  wsClient.addMessageListener(async (message) => {
    try {
      await messageHandler.handleDecodedMessage(message);
    } catch (error) {
      console.warn("Browser Control MCP: command handler error", error);
      if (error instanceof Error) {
        await wsClient.sendErrorToServer(message.correlationId, error.message);
      }
    }
  });

  clients.push(wsClient);
}

function reconnectAllClients(): void {
  for (const client of clients) {
    client.connect();
  }
}

async function setupReconnectAlarm(): Promise<void> {
  await browser.alarms.create(RECONNECT_ALARM, { periodInMinutes: 1 });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === RECONNECT_ALARM) {
      reconnectAllClients();
    }
  });
}

initExtension()
  .then(async (config) => {
    if (config.wsUrls!.length === 0) {
      console.error("No WebSocket URLs configured");
      return;
    }
    for (const wsUrl of config.wsUrls!) {
      initClient(wsUrl, config.browserId!, config.secret ?? "", config.label);
    }
    await setupReconnectAlarm();
    console.log("Browser Control MCP (Chrome) initialized");
  })
  .catch((error) => {
    console.error("Error initializing extension:", error);
  });

async function initExtension() {
  return getConfig();
}
