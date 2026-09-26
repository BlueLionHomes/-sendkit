---
name: sendkit
description: Use SendKit to send Telegram messages from agents through the SendKit MCP tool or CLI fallback. Use when a user asks to send a Telegram message, use SendKit, interact with the SendKit toolset, verify SendKit manually, or choose between SendKit MCP and CLI workflows. Also use it whenever someone wants to notify, ping, alert, or message a person or group on Telegram from an agent, even if they don't mention SendKit by name.
---

# SendKit

SendKit sends plain-text Telegram messages through a Telegram bot. The same send operation is available three ways:

| Surface | How you get it | Where the bot token comes from |
| --- | --- | --- |
| Local MCP server (stdio) | npm package `@royallionhomes/sendkit-mcp` (`sendkit-mcp` binary) | `TELEGRAM_BOT_TOKEN` env var in the MCP client config |
| Remote MCP server (HTTP) | A hosted SendKit endpoint at `https://<host>/<botToken>/mcp` | The URL path; requests are authenticated with OAuth |
| CLI | npm package `@royallionhomes/sendkit`, run with `bun x` / `npx` | `~/.config/sendkit/config.json`, written by `init` |

All three take the same two inputs and return the same result, so a message sent one way looks exactly like a message sent another way.

## Inputs and output

- `chatId` (string, required): the Telegram chat to send to. Private chats use a positive number such as `"123456789"`. Groups and supergroups use a negative number such as `"-1001234567890"`. Public channels can use `"@channelname"`. Pass it as a string even when it looks numeric.
- `message` (string, required, non-empty): the text to send. It goes out as plain text. No `parse_mode` is set, so Markdown or HTML shows up literally. Write the message the way it should look in Telegram.

A successful send returns:

```json
{ "ok": true, "chatId": "123456789", "messageId": 42 }
```

The MCP tool also returns a text summary: `sent Telegram message 42 to chat 123456789`.

## Choosing MCP or CLI

Use the MCP tool first. It's a structured tool call, the token stays inside the server config, and nothing depends on the shell environment. Fall back to the CLI only when the MCP tool isn't available or doesn't work.

1. **Look for the MCP tool.** It's registered as `telegram`, and the client usually prefixes it with whatever name the user gave the server, for example `mcp__sendkit__telegram`. Look for any `telegram` tool whose prefix mentions SendKit. If the client lists the tool as deferred or lazy-loaded, load its schema first and then call it.
2. **If both local and remote tools are available**, use the one the user names. If they don't name one, use the local one. Each server may be set up with a different bot, and the bot sets which chats you can reach.
3. **Fall back to the CLI** when there's no SendKit MCP tool, the server fails to start, or the MCP call fails for a setup reason (for example, missing `TELEGRAM_BOT_TOKEN` or a 401 from the remote server) and the CLI is configured. Don't switch surfaces to get around a Telegram-side error such as "chat not found". The other surface calls the same API and fails the same way.
4. **If the user explicitly asks for the CLI or MCP**, use what they asked for. They may be testing that specific surface.

## Before sending

Sending a Telegram message is visible to other people and can't be undone from SendKit (it has no edit or delete operation). So:

- Make sure you know the exact `chatId` and the exact text. If the user gave a name ("send it to the team group") instead of an ID, ask for the chat ID. Don't guess it.
- If you wrote or reworded the message yourself, show the final text and the target chat, and get a yes before sending. If the user dictated both verbatim, you can send right away.
- Send once. If a call fails, read the error before retrying so you don't send duplicates.

Treat the bot token as a secret. Don't print it, paste it into messages, or ask the user to type it into the chat. If a token is needed, point them to the setup steps below so they can configure it themselves. (One exception: the remote MCP URL contains the token by design. Don't repeat that URL back unless you have to.)

## Sending with the MCP tool

Call the tool with both fields:

```json
{ "chatId": "123456789", "message": "Deploy finished: v1.4.2 is live." }
```

Report the `messageId` and `chatId` from the result back to the user so they can confirm the message arrived.

## Sending with the CLI

Run the CLI without a gloabl install with `bun x` (or `npx` if Bun isn't installed). Running it this way fetches the published package the same way the MCP server configs do, so nothing needs to be on PATH:

```bash
bun x -y @royallionhomes/sendkit telegram <chatId> "<message>"
# or
npx -y @royallionhomes/sendkit telegram <chatId> "<message>"
```

- Quote the message so the shell passes it as one argument. In PowerShell, use single quotes to keep `$` from expanding. Negative group IDs are fine as positional arguments.
- On success it prints a single JSON line (`{"ok":true,"chatId":"...","messageId":...}`) and exits 0. On failure it prints the error to stderr and exits 1.

One-time setup (the user runs this with their own token, so the token never passes through the conversation):

```bash
bun x -y @royallionhomes/sendkit init --telegram-bot-token <botToken>
```

This writes `~/.config/sendkit/config.json` with file mode 600. Later `bun x` / `npx` runs read the same file.

## Setting up the MCP servers

**Local (stdio):** add the server to the MCP client config with the token in its environment:

```json
{
  "mcpServers": {
    "sendkit": {
      "type": "stdio",
      "command": "bun",
      "args": ["x", "-y", "@royallionhomes/sendkit-mcp@latest"],
      "env": { "TELEGRAM_BOT_TOKEN": "<botToken>" }
    }
  }
}
```

Without Bun, use `"command": "npx"` with `"args": ["-y", "@royallionhomes/sendkit-mcp@latest"]`. Clients with their own config format take the same command in a different shape. For example, opencode's `opencode.json` puts the whole command in one array under `mcp.sendkit` (`"type": "local"`, `"command": ["bun", "x", "-y", "@royallionhomes/sendkit-mcp"]`), with the token under `environment`.

After changing the config, the MCP client has to restart before it picks up the tool.

**Remote (HTTP):** add the hosted endpoint `https://<host>/<botToken>/mcp` as a remote MCP server in the client. On first connect the server returns 401 with OAuth discovery metadata, and the client walks the user through signing in. Once connected, the `telegram` tool appears like any other MCP tool.

## Verifying SendKit manually

When the user wants to check that SendKit works end to end:

1. Get a chat ID the user controls (for example, their own private chat with the bot). The user must have messaged the bot at least once (for example, `/start`), because Telegram bots can't start a conversation.
2. Send a clearly labeled test message through the surface being tested, for example `SendKit test from <surface> at <time>`.
3. Check the result: `ok: true` and a numeric `messageId`.
4. Ask the user to confirm that the message appeared in Telegram. A returned `messageId` means Telegram accepted it. Only the user can confirm it arrived where they expected.
5. To test both surfaces, repeat with the other one and compare. Both should return the same result shape.

## Troubleshooting

| Error | Meaning | Fix |
| --- | --- | --- |
| `Telegram bot token is required. Run \`sendkit init\`.` | The CLI has no saved config | The user runs `bun x -y @royallionhomes/sendkit init --telegram-bot-token <token>` |
| `TELEGRAM+BOT+TOKEN is required...` (sic) | The local MCP server has no `TELEGRAM_BOT_TOKEN` | Add it to the server's `env` in the MCP client config, then restart the client |
| `Unauthorized` from Telegram | The bot token is wrong or was revoked | Get a fresh token from @BotFather and reconfigure |
| `Bad Request: chat not found` | Wrong chat ID, or the bot has never been messaged in (or added to) that chat | Check the ID and have the user `/start` the bot or add it to the group |
| `Forbidden: bot was blocked by the user` | The recipient blocked the bot | The recipient has to unblock it. Retrying won't help |
| HTTP 401 `{"error":"Unauthorized"}` from the remote MCP | OAuth is missing or expired | Reconnect or re-authenticate the remote server in the client |
| Validation error: `Chat ID is required` / `Message is required` | An empty field was passed | Provide both fields as non-empty strings |
