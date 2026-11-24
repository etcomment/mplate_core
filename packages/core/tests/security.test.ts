import { describe, expect, it } from 'vitest'
import { parseBrandKit } from '../src/brand/parse.js'
import { parseArguments } from '../src/cli/args.js'
import { parseDsl } from '../src/dsl/parse.js'
import { svgToPng } from '../src/export/png.js'
import { resolveIconName } from '../src/icons/index.js'
import { McpServer } from '../src/mcp/server.js'
import { render } from '../src/render/render.js'
import { element, serialize } from '../src/svg/node.js'
import { findTheme } from '../src/theme/resolve.js'

const BASE_KIT = {
  kind: 'mplate-brand-kit',
  version: 1,
  name: 'Security Test',
}

describe('core security hardening', () => {
  describe('brand kit SVG & data URI validation', () => {
    it('accepts safe inline SVG with xmlns and internal fragment references', () => {
      const safeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 30"><defs><linearGradient id="g"><stop offset="0%" stop-color="#111"/></linearGradient></defs><rect width="100" height="30" fill="url(#g)"/></svg>'
      const result = parseBrandKit({ ...BASE_KIT, logo: { src: safeSvg, width: 100, height: 30 } })
      expect(result.kit?.logo?.src).toMatch(/^data:image\/svg\+xml;utf8,/)
      expect(result.diagnostics).toEqual([])
    })

    it('accepts valid raster PNG data URIs', () => {
      const pngUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
      const result = parseBrandKit({ ...BASE_KIT, logo: { src: pngUri, width: 32, height: 32 } })
      expect(result.kit?.logo?.src).toBe(pngUri)
    })

    it.each([
      ['<script>', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
      ['onload=', '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><rect width="10" height="10"/></svg>'],
      ['<foreignObject>', '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><body xmlns="http://www.w3.org/1999/xhtml">x</body></foreignObject></svg>'],
      ['javascript:', '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><rect width="10" height="10"/></a></svg>'],
      ['external href', '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/x.png" width="10" height="10"/></svg>'],
      ['external CSS url()', '<svg xmlns="http://www.w3.org/2000/svg"><style>rect{fill:url(https://evil.example/x)}</style><rect width="10" height="10"/></svg>'],
      ['@import', '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url("https://evil.example/x.css");</style></svg>'],
      ['base64 SVG with script', `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString('base64')}`],
      ['invalid raster base64', 'data:image/png;base64,not!valid!base64'],
    ])('rejects %s logo payload', (_label, src) => {
      const result = parseBrandKit({ ...BASE_KIT, logo: { src, width: 64, height: 32 } })
      expect(result.kit).toBeUndefined()
      expect(result.diagnostics.some((diagnostic) => diagnostic.severity === 'error')).toBe(true)
    })

    it('rejects oversized logos (> 256 KB)', () => {
      const bigSvg = `<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/><!--${'a'.repeat(270_000)}--></svg>`
      const result = parseBrandKit({ ...BASE_KIT, logo: { src: bigSvg, width: 64, height: 32 } })
      expect(result.kit).toBeUndefined()
    })

    it('rejects unsafe font values and ignores prototype keys in styles', () => {
      const badFont = parseBrandKit({ ...BASE_KIT, fonts: { heading: 'Arial; } </style><script>' } })
      expect(badFont.kit).toBeUndefined()
      const protoStyles = JSON.parse('{"kind":"mplate-brand-kit","version":1,"name":"X","styles":{"__proto__":"steps","constructor":"steps","process":"steps"}}')
      const parsed = parseBrandKit(protoStyles)
      expect(parsed.kit?.styles).toEqual({ process: 'steps' })
      expect(Object.hasOwn(parsed.kit?.styles ?? {}, 'constructor')).toBe(false)
    })
  })

  describe('prototype chain & unsafe key guards', () => {
    it('does not resolve Object.prototype names as icons or themes', () => {
      expect(resolveIconName('toString')).toBeUndefined()
      expect(resolveIconName('constructor')).toBeUndefined()
      expect(resolveIconName('__proto__')).toBeUndefined()
      expect(findTheme('toString')).toBeUndefined()
      expect(findTheme('constructor')).toBeUndefined()
    })

    it('ignores dangerous attribute keys in DSL and prototype overrides', () => {
      const result = render('@process\n  theme constructor\n  step "A" constructor:x __proto__:y icon:toString', {
        overrides: Object.assign(Object.create(null), {
          'step-0': { dx: 1e308, dy: -1e308 },
          constructor: { title: 'pwn' },
        }),
      })
      expect(result.ok).toBe(true)
      expect(result.svg).toContain('translate(10000.00 -10000.00)')
      expect(result.unusedOverrides).not.toContain('constructor')
    })

    it('handles non-plain override entries safely', () => {
      const result = render('@process\n  step "A"', {
        overrides: { 'step-0': null as unknown as Record<string, string> },
      })
      expect(result.ok).toBe(true)
      expect(result.svg).toContain('A')
    })

    it('ignores dangerous CLI option names', () => {
      const parsed = parseArguments(['render', '-toString', '--__proto__=polluted', '--constructor=x', '--no-constructor'])
      expect(Object.hasOwn(parsed.options, '__proto__')).toBe(false)
      expect(Object.hasOwn(parsed.options, 'constructor')).toBe(false)
      expect(parsed.options.toString).toBe(true)
    })
  })

  describe('DSL bounds & SVG serialization safety', () => {
    it('rejects oversized DSL sources (> 256 KB)', () => {
      const huge = `@process\n  step "${'x'.repeat(270_000)}"`
      const parsed = parseDsl(huge)
      expect(parsed.document).toBeUndefined()
      expect(parsed.diagnostics[0]?.message).toContain('256 KB')
    })

    it('rejects DSL documents exceeding 2000 lines', () => {
      const manyLines = ['@process', ...Array.from({ length: 2005 }, () => '  step "A"')].join('\n')
      const parsed = parseDsl(manyLines)
      expect(parsed.document).toBeUndefined()
      expect(parsed.diagnostics[0]?.message).toContain('2000')
    })

    it('rejects DSL nesting deeper than 16 levels', () => {
      const deep = ['@org', ...Array.from({ length: 20 }, (_, index) => `${'  '.repeat(index + 1)}node "N${index}"`)].join('\n')
      const parsed = parseDsl(deep)
      expect(parsed.diagnostics.some((diagnostic) => diagnostic.message.includes('Maximum nesting depth'))).toBe(true)
    })

    it('rejects invalid SVG tag or attribute names during serialization', () => {
      expect(() => serialize(element('script onload=1'))).toThrow(/Invalid SVG tag name/)
      expect(() => serialize(element('rect', { 'x" onload="alert(1)': '0' }))).toThrow(/Invalid SVG attribute name/)
    })
  })

  describe('PNG scale bounds & MCP path validation', () => {
    it('rejects out-of-range or non-finite PNG export scales', async () => {
      await expect(svgToPng('<svg xmlns="http://www.w3.org/2000/svg"/>', { scale: 0 })).rejects.toThrow(/scale/)
      await expect(svgToPng('<svg xmlns="http://www.w3.org/2000/svg"/>', { scale: Number.NaN })).rejects.toThrow(/scale/)
      await expect(svgToPng('<svg xmlns="http://www.w3.org/2000/svg"/>', { scale: 100 })).rejects.toThrow(/scale/)
    })

    it('rejects invalid MCP output formats and mismatched output_path extensions', async () => {
      const written: Record<string, string | Uint8Array> = {}
      const server = new McpServer({ writeFile: async (filePath, content) => { written[filePath] = content } })

      const badFormat = await server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'mplate_render', arguments: { dsl: '@process\n  step "A"', format: 'html' } } })
      expect((badFormat?.result as { isError?: boolean }).isError).toBe(true)

      const badPath = await server.handle({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'mplate_render', arguments: { dsl: '@process\n  step "A"', output_path: '/tmp/.bashrc' } } })
      expect((badPath?.result as { isError?: boolean }).isError).toBe(true)

      const mismatchExt = await server.handle({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'mplate_render', arguments: { dsl: '@process\n  step "A"', format: 'svg', output_path: '/tmp/out.png' } } })
      expect((mismatchExt?.result as { isError?: boolean }).isError).toBe(true)

      const nullByte = await server.handle({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'mplate_render', arguments: { dsl: '@process\n  step "A"', output_path: '/tmp/out.svg\0.png' } } })
      expect((nullByte?.result as { isError?: boolean }).isError).toBe(true)

      expect(Object.keys(written)).toEqual([])
    })

    it('enforces MPLATE_MCP_OUT_DIR containment when configured', async () => {
      const previous = process.env.MPLATE_MCP_OUT_DIR
      process.env.MPLATE_MCP_OUT_DIR = '/tmp/mplate-safe-out'
      try {
        const written: Record<string, string | Uint8Array> = {}
        const server = new McpServer({ writeFile: async (filePath, content) => { written[filePath] = content } })

        const outside = await server.handle({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'mplate_render', arguments: { dsl: '@process\n  step "A"', output_path: '/tmp/escape.svg' } } })
        expect((outside?.result as { isError?: boolean }).isError).toBe(true)

        const traversal = await server.handle({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'mplate_render', arguments: { dsl: '@process\n  step "A"', output_path: '/tmp/mplate-safe-out/../escape.svg' } } })
        expect((traversal?.result as { isError?: boolean }).isError).toBe(true)

        const inside = await server.handle({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'mplate_render', arguments: { dsl: '@process\n  step "A"', output_path: '/tmp/mplate-safe-out/ok.svg' } } })
        expect((inside?.result as { isError?: boolean }).isError).toBeUndefined()
        expect(written['/tmp/mplate-safe-out/ok.svg']).toBeDefined()
      } finally {
        if (previous === undefined) delete process.env.MPLATE_MCP_OUT_DIR
        else process.env.MPLATE_MCP_OUT_DIR = previous
      }
    })
  })
})
