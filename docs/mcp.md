# MCP server

`mplate-mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server over stdio. It lets an AI assistant learn the DSL, validate its own output and render visuals. It has no dependencies beyond Node ≥ 20 (plus `@resvg/resvg-js` if you want PNG).

## Configuration

Claude Desktop (`claude_desktop_config.json`), Claude Code (`.mcp.json`) or any MCP client:

```json
{
  "mcpServers": {
    "mplate": { "command": "npx", "args": ["-y", "-p", "@mplate/core", "mplate-mcp"] }
  }
}
```

From a local clone: `"command": "node", "args": ["/path/to/mplate_core/packages/core/dist/mcp/main.js"]` after `npm run build`.

Claude Code in one line: `claude mcp add mplate -- npx -y -p @mplate/core mplate-mcp`.

## Tools

| Tool | Arguments | Returns |
| --- | --- | --- |
| `mplate_guide` | — | The full DSL reference with every template identity card (same text as `mplate guide` and [llm-guide.md](llm-guide.md)). |
| `mplate_list_templates` | — | One line per template: id, purpose, element range. |
| `mplate_describe_template` | `template` | One identity card with a working example. |
| `mplate_validate` | `dsl` | Errors and warnings with line numbers and hints. |
| `mplate_render` | `dsl`, `theme?`, `width?`, `format?` (`svg`/`png`), `output_path?`, `preview?` | SVG markup inline, or the file written to `output_path`; with `preview: true`, also a PNG image the assistant can look at. |

The server announces short instructions on `initialize`: learn the DSL with `mplate_guide`, write one line per element, then render.

## Protocol

JSON-RPC 2.0, newline-delimited, over stdin/stdout. Supported protocol versions: `2025-06-18`, `2025-03-26`, `2024-11-05`. Implemented methods: `initialize`, `ping`, `tools/list`, `tools/call`; notifications are accepted and ignored.
