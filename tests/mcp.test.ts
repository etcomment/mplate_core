import { describe, expect, it } from 'vitest'
import { McpServer } from '../src/mcp/server.js'

function createServer() {
  const written: Record<string, string | Uint8Array> = {}
  const server = new McpServer({ writeFile: async (path, content) => { written[path] = content } })
  return { server, written }
}

describe('mcp server', () => {
  it('negotiates the protocol version', async () => {
    const { server } = createServer()
    const response = await server.handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1' } } })
    expect(response?.result).toMatchObject({ protocolVersion: '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'mplate' } })
  })

  it('ignores notifications and rejects unknown methods', async () => {
    const { server } = createServer()
    expect(await server.handle({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeUndefined()
    expect((await server.handle({ jsonrpc: '2.0', id: 2, method: 'nope' }))?.error?.code).toBe(-32601)
  })

  it('lists tools with JSON schemas', async () => {
    const { server } = createServer()
    const response = await server.handle({ jsonrpc: '2.0', id: 3, method: 'tools/list' })
    const tools = (response?.result as { tools: { name: string; inputSchema: { type: string } }[] }).tools
    expect(tools.map((tool) => tool.name)).toEqual(['mplate_guide', 'mplate_list_templates', 'mplate_describe_template', 'mplate_validate', 'mplate_render'])
    expect(tools.every((tool) => tool.inputSchema.type === 'object')).toBe(true)
  })

  it('renders SVG inline and to a file', async () => {
    const { server, written } = createServer()
    const inline = await server.handle({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'mplate_render', arguments: { dsl: '@process\n  step "A"' } } })
    const content = (inline?.result as { content: { type: string; text?: string }[] }).content
    expect(content[1]!.text).toContain('<svg')
    await server.handle({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'mplate_render', arguments: { dsl: '@process\n  step "A"', output_path: '/tmp/out.svg' } } })
    expect(String(written['/tmp/out.svg'])).toContain('<svg')
  })

  it('returns tool errors with diagnostics', async () => {
    const { server } = createServer()
    const response = await server.handle({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'mplate_validate', arguments: { dsl: '@process\n  stepp "A"' } } })
    const result = response?.result as { isError: boolean; content: { text: string }[] }
    expect(result.isError).toBe(true)
    expect(result.content[0]!.text).toContain('Unknown keyword "stepp"')
  })

  it('returns a PNG preview image', async () => {
    const { server } = createServer()
    const response = await server.handle({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'mplate_render', arguments: { dsl: '@kpi\n  metric "A" "1"', preview: true } } })
    const content = (response?.result as { content: { type: string; mimeType?: string }[] }).content
    expect(content.some((entry) => entry.type === 'image' && entry.mimeType === 'image/png')).toBe(true)
  })
})
