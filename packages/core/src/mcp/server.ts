import { VERSION } from '../version.js'
import { TOOLS, type ToolEnvironment } from './tools.js'

export const SUPPORTED_PROTOCOL_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05']

type JsonRpcId = string | number | null

export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: JsonRpcId
  method: string
  params?: Record<string, unknown>
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: JsonRpcId
  result?: unknown
  error?: { code: number; message: string }
}

const INSTRUCTIONS = 'mplate turns a few lines of text into a designed infographic (process, timeline, funnel, pyramid, cycle, mind map, cards, KPI tiles, comparison, 2×2 matrix). Call mplate_guide once to learn the DSL, write one line per element, then call mplate_render. The layout adapts to the number of elements.'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  return isRecord(value) && value.jsonrpc === '2.0' && typeof value.method === 'string'
}

export class McpServer {
  private readonly environment: ToolEnvironment

  constructor(environment: ToolEnvironment) {
    this.environment = environment
  }

  async handle(request: JsonRpcRequest): Promise<JsonRpcResponse | undefined> {
    if (request.id === undefined) return undefined
    const id = request.id
    try {
      const result = await this.dispatch(request.method, request.params ?? {})
      if (result === undefined) return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${request.method}` } }
      return { jsonrpc: '2.0', id, result }
    } catch (error) {
      return { jsonrpc: '2.0', id, error: { code: -32603, message: error instanceof Error ? error.message : String(error) } }
    }
  }

  private async dispatch(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'initialize': {
        const requested = typeof params.protocolVersion === 'string' ? params.protocolVersion : ''
        return {
          protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requested) ? requested : SUPPORTED_PROTOCOL_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'mplate', title: 'mplate', version: VERSION },
          instructions: INSTRUCTIONS,
        }
      }
      case 'ping':
        return {}
      case 'tools/list':
        return { tools: TOOLS.map(({ name, title, description, inputSchema }) => ({ name, title, description, inputSchema })) }
      case 'tools/call': {
        const tool = TOOLS.find((candidate) => candidate.name === params.name)
        if (!tool) return { content: [{ type: 'text', text: `Unknown tool: ${String(params.name)}` }], isError: true }
        const argumentsObject = isRecord(params.arguments) ? params.arguments : {}
        try {
          return await tool.run(argumentsObject, this.environment)
        } catch (error) {
          return { content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }], isError: true }
        }
      }
      default:
        return undefined
    }
  }
}
