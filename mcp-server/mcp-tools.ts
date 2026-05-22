import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BrowserAPI } from "./browser-api";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export function createBrowserControlServer(browserApi: BrowserAPI): McpServer {
  const mcpServer = new McpServer({
    name: "BrowserControl",
    version: "1.5.1",
  });

  mcpServer.tool(
    "open-browser-tab",
    "Open a new tab in the user's browser (useful when the user asks to open a website)",
    { url: z.string() },
    async ({ url }) => {
      const openedTabId = await browserApi.openTab(url);
      if (openedTabId !== undefined) {
        return {
          content: [
            {
              type: "text",
              text: `${url} opened in tab id ${openedTabId}`,
            },
          ],
        };
      } else {
        return {
          content: [{ type: "text", text: "Failed to open tab", isError: true }],
        };
      }
    }
  );

  mcpServer.tool(
    "close-browser-tabs",
    "Close tabs in the user's browser by tab IDs",
    { tabIds: z.array(z.number()) },
    async ({ tabIds }) => {
      await browserApi.closeTabs(tabIds);
      return {
        content: [{ type: "text", text: "Closed tabs" }],
      };
    }
  );

  mcpServer.tool(
    "get-list-of-open-tabs",
    "Get the list of open tabs in the user's browser. Use offset and limit parameters for pagination when there are many tabs.",
    {
      offset: z.number().int().min(0).default(0).describe("Starting index for pagination (0-based, must be >= 0)"),
      limit: z.number().default(100).describe("Maximum number of tabs to return (default: 100, max: 500)"),
    },
    async ({ offset, limit }) => {
      const effectiveLimit = Math.min(Math.max(1, limit), 500);

      const openTabs = await browserApi.getTabList();
      const totalTabs = openTabs.length;

      const paginatedTabs = openTabs.slice(offset, offset + effectiveLimit);
      const hasMore = offset + effectiveLimit < totalTabs;

      const paginationInfo = {
        type: "text" as const,
        text: `Showing tabs ${offset + 1}-${offset + paginatedTabs.length} of ${totalTabs} total tabs${hasMore ? ` (use offset=${offset + effectiveLimit} to see more)` : ""}`,
      };

      const tabContent = paginatedTabs.map((tab) => {
        let lastAccessed = "unknown";
        if (tab.lastAccessed) {
          lastAccessed = dayjs(tab.lastAccessed).fromNow();
        }
        return {
          type: "text" as const,
          text: `tab id=${tab.id}, tab url=${tab.url}, tab title=${tab.title}, last accessed=${lastAccessed}`,
        };
      });

      return {
        content: [paginationInfo, ...tabContent],
      };
    }
  );

  mcpServer.tool(
    "get-recent-browser-history",
    "Get the list of recent browser history (to get all, don't use searchQuery)",
    { searchQuery: z.string().optional() },
    async ({ searchQuery }) => {
      const browserHistory = await browserApi.getBrowserRecentHistory(
        searchQuery
      );
      if (browserHistory.length > 0) {
        return {
          content: browserHistory.map((item) => {
            let lastVisited = "unknown";
            if (item.lastVisitTime) {
              lastVisited = dayjs(item.lastVisitTime).fromNow();
            }
            return {
              type: "text",
              text: `url=${item.url}, title="${item.title}", lastVisitTime=${lastVisited}`,
            };
          }),
        };
      } else {
        const hint = searchQuery ? "Try without a searchQuery" : "";
        return { content: [{ type: "text", text: `No history found. ${hint}` }] };
      }
    }
  );

  mcpServer.tool(
    "get-tab-web-content",
    `
    Get the full text content of the webpage and the list of links in the webpage, by tab ID. 
    Use "offset" only for larger documents when the first call was truncated and if you require more content in order to assist the user.
  `,
    { tabId: z.number(), offset: z.number().default(0) },
    async ({ tabId, offset }) => {
      const content = await browserApi.getTabContent(tabId, offset);
      let links: { type: "text"; text: string }[] = [];
      if (offset === 0) {
        links = content.links.map((link: { text: string; url: string }) => {
          return {
            type: "text",
            text: `Link text: ${link.text}, Link URL: ${link.url}`,
          };
        });
      }

      let text = content.fullText;
      let hint: { type: "text"; text: string }[] = [];
      if (content.isTruncated || offset > 0) {
        const rangeString = `${offset}-${offset + text.length}`;
        hint = [
          {
            type: "text",
            text:
              `The following text content is truncated due to size (includes character range ${rangeString} out of ${content.totalLength}). ` +
              "If you want to read characters beyond this range, please use the 'get-tab-web-content' tool with an offset. ",
          },
        ];
      }

      return {
        content: [...hint, { type: "text", text }, ...links],
      };
    }
  );

  mcpServer.tool(
    "reorder-browser-tabs",
    "Change the order of open browser tabs",
    { tabOrder: z.array(z.number()) },
    async ({ tabOrder }) => {
      const newOrder = await browserApi.reorderTabs(tabOrder);
      return {
        content: [
          { type: "text", text: `Tabs reordered: ${newOrder.join(", ")}` },
        ],
      };
    }
  );

  mcpServer.tool(
    "find-highlight-in-browser-tab",
    "Find and highlight text in a browser tab (use a query phrase that exists in the web content)",
    { tabId: z.number(), queryPhrase: z.string() },
    async ({ tabId, queryPhrase }) => {
      const noOfResults = await browserApi.findHighlight(tabId, queryPhrase);
      return {
        content: [
          {
            type: "text",
            text: `Number of results found and highlighted in the tab: ${noOfResults}`,
          },
        ],
      };
    }
  );

  mcpServer.tool(
    "group-browser-tabs",
    "Organize opened browser tabs in a new tab group",
    {
      tabIds: z.array(z.number()),
      isCollapsed: z.boolean().default(false),
      groupColor: z
        .enum([
          "grey",
          "blue",
          "red",
          "yellow",
          "green",
          "pink",
          "purple",
          "cyan",
          "orange",
        ])
        .default("grey"),
      groupTitle: z.string().default("New Group"),
    },
    async ({ tabIds, isCollapsed, groupColor, groupTitle }) => {
      const groupId = await browserApi.groupTabs(
        tabIds,
        isCollapsed,
        groupColor,
        groupTitle
      );
      return {
        content: [
          {
            type: "text",
            text: `Created tab group "${groupTitle}" with ${tabIds.length} tabs (group ID: ${groupId})`,
          },
        ],
      };
    }
  );

  mcpServer.tool(
    "evaluate-script-in-tab",
    "Evaluate a JavaScript function in a browser tab. The function must be JSON-serializable. Example function: () => document.title",
    {
      tabId: z.number(),
      function: z
        .string()
        .describe(
          'JavaScript function expression, e.g. "() => document.title" or "(selector) => document.querySelector(selector)?.innerText"'
        ),
      args: z
        .array(z.unknown())
        .optional()
        .describe("Optional arguments passed to the function"),
    },
    async ({ tabId, function: fn, args }) => {
      const result = await browserApi.evaluateScript(tabId, fn, args);
      if (
        result &&
        typeof result === "object" &&
        "__error" in result &&
        typeof (result as { __error?: string }).__error === "string"
      ) {
        return {
          content: [
            {
              type: "text",
              text: (result as { __error: string }).__error,
              isError: true,
            },
          ],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  mcpServer.tool(
    "query-dom-in-tab",
    "Query DOM elements in a browser tab using a CSS selector. Modes: text (innerText of first match), html (outerHTML fragment), list (summary of all matches).",
    {
      tabId: z.number(),
      selector: z.string().describe("CSS selector, e.g. #main or .article h1"),
      mode: z
        .enum(["text", "html", "list"])
        .default("text")
        .describe("text=innerText, html=outerHTML, list=all matching elements"),
      limit: z
        .number()
        .default(20)
        .describe("Max elements returned in list mode"),
      maxHtmlLength: z
        .number()
        .default(5000)
        .describe("Max HTML characters per element in html/list modes"),
    },
    async ({ tabId, selector, mode, limit, maxHtmlLength }) => {
      const result = await browserApi.queryDom(
        tabId,
        selector,
        mode,
        limit,
        maxHtmlLength
      );
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  mcpServer.tool(
    "get-console-messages-in-tab",
    "Read console.log/info/warn/error/debug messages from a browser tab. Installs a console interceptor on first use. Re-run after page navigation to capture logs on the new document.",
    {
      tabId: z.number(),
      clear: z
        .boolean()
        .default(false)
        .describe("Clear buffered console messages after reading"),
      level: z
        .enum(["log", "info", "warn", "error", "debug"])
        .optional()
        .describe("Filter by console level"),
      limit: z
        .number()
        .default(100)
        .describe("Maximum number of messages to return"),
    },
    async ({ tabId, clear, level, limit }) => {
      const result = await browserApi.getConsoleMessages(
        tabId,
        clear,
        level,
        limit
      );
      if (result.entries.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No console messages captured yet. Messages logged after this tool runs will appear here.",
            },
          ],
        };
      }
      return {
        content: result.entries.map((entry) => ({
          type: "text" as const,
          text: `[${entry.level}] ${entry.messages.map(String).join(" ")}`,
        })),
      };
    }
  );

  return mcpServer;
}
