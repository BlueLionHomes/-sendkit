import { Hono } from "hono";
import { 
    McpServer, createMcpHandler
} from "@modelcontextprotocol/server";


import { sendTelegramMessage, telegramMessageInputSchema } from "sendkit-core";

function createServer(botToken: string) {
    const server = new McpServer({
        name: "sendkit-remote",
        version: "0.0.0",
    });

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
            botToken,
        });
        return{
            content: [
                {
                    type: "text",
                    text: `sent Telegram message ${result.messageId} to chat ${result.chatId}`,
                }
            ],
            structuredContent: result,
        }
    },
)

return server;
};

const app = new Hono();

app.post("/:botToken/mcp", async (c) => {
    const botToken = c.req.param("botToken");
    const handler = createMcpHandler(() => createServer(botToken));

    return handler.fetch(c.req.raw);
});

app.notFound((c)=> {
    return c.json({ error: "Not found" }, 404);
});

const port = Number(process.env.PORT ?? 3000);

export default {
    port,
    fetch: app.fetch,
};
