import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";

import { sendTelegramMessage, telegramMessageInputSchema } from "@royallionhomes/sendkit-core";

const server = new McpServer({
  name: "sendkit-local",
  version: "0.0.0",
});

function getTelegramBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM+BOT+TOKEN is required. COnfigure it in your MCP client environment.");
  }

  return token;
}

server.registerTool(
  "telegram",
  {
    title: "Telegram",
    description: "Send a Telegram message",
    inputSchema: telegramMessageInputSchema.shape,
  },
  async (input) => {
    const result = await sendTelegramMessage({
      ...input,
      botToken: getTelegramBotToken(),
    });
    return {
      content: [
        {
          type: "text",
          text: `sent Telegram message ${result.messageId} to chat ${result.chatId}`,
        },
      ],
      structuredContent: result,
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
