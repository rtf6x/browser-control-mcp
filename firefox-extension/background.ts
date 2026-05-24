import { createWebsocketClient } from "./client";
import { MessageHandler } from "./message-handler";
import { getConfig } from "./extension-config";

browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    void browser.runtime.openOptionsPage();
  }
});

function initClient(
  wsUrl: string,
  browserId: string,
  label?: string
) {
  const wsClient = createWebsocketClient(wsUrl, browserId, "", label, "firefox");
  const messageHandler = new MessageHandler(wsClient);

  wsClient.connect();

  wsClient.addMessageListener(async (message) => {
    console.log("Message from server:", message);

    try {
      await messageHandler.handleDecodedMessage(message);
    } catch (error) {
      console.error("Error handling message:", error);
      if (error instanceof Error) {
        await wsClient.sendErrorToServer(message.correlationId, error.message);
      }
    }
  });
}

getConfig()
  .then((config) => {
    const wsUrlList = config.wsUrls;
    if (!wsUrlList?.length) {
      console.error("No WebSocket URLs configured in extension config");
      return;
    }
    for (const wsUrl of wsUrlList) {
      initClient(wsUrl, config.browserId!, config.label);
    }
    console.log("Browser extension initialized");
  })
  .catch((error) => {
    console.error("Error initializing extension:", error);
  });
