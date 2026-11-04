import { describe, expect, it } from 'vitest'
import { runCli, type CliIo } from '../src/cli/run.js'

function memoryIo(files: Record<string, string> = {}, stdin: string = '') {
  const output = { stdout: '', stderr: '', written: {} as Record<string, string | Uint8Array> }
  const io: CliIo = {
    stdout: (text) => { output.stdout += text },
    stderr: (text) => { output.stderr += text },
    readText: async (path) => {
      const content = files[path]
      if (content === undefined) throw new Error(`ENOENT: ${path}`)
      return content
    },
    readStdin: async () => stdin,
    writeFile: async (path, content) => { output.written[path] = content },
  }
  return { io, output }
}

describe('cli', () => {
  it('renders stdin to stdout', async () => {
    const { io, output } = memoryIo({}, '@process\n  step "A"')
    expect(await runCli(['render', '-'], io)).toBe(0)
    expect(output.stdout).toContain('<svg')
  })

  it('renders a file to an output path with a theme file', async () => {
    const { io, output } = memoryIo({ 'in.mplate': '@cards\n  card "A"', 'brand.json': '{"palette":["#123456"]}' })
    expect(await runCli(['render', 'in.mplate', '-o', 'out.svg', '--theme', 'brand.json'], io)).toBe(0)
    expect(String(output.written['out.svg'])).toContain('#123456')
    expect(output.stderr).toContain('Wrote out.svg')
  })

  it('renders PNG files', async () => {
    const { io, output } = memoryIo({ 'in.mplate': '@cards\n  card "A"' })
    expect(await runCli(['render', 'in.mplate', '-o', 'out.png', '--scale', '1'], io)).toBe(0)
    const png = output.written['out.png'] as Uint8Array
    expect(Array.from(png.slice(1, 4))).toEqual([0x50, 0x4e, 0x47])
  })

  it('fails with diagnostics on invalid input', async () => {
    const { io, output } = memoryIo({}, '@nope\n  x "A"')
    expect(await runCli(['render', '-'], io)).toBe(1)
    expect(output.stderr).toContain('line 1: error')
  })

  it('validates, lists, describes and prints the guide', async () => {
    const { io, output } = memoryIo({}, '@funnel\n  level "A"\n  level "B"')
    expect(await runCli(['validate', '-'], io)).toBe(0)
    expect(output.stdout).toContain('OK: funnel:stack with 2 element(s)')
    expect(await runCli(['list'], io)).toBe(0)
    expect(output.stdout).toContain('process:chevrons')
    expect(await runCli(['describe', 'brain:arc'], io)).toBe(0)
    expect(output.stdout).toContain('@brain2')
    expect(await runCli(['guide'], io)).toBe(0)
    expect(output.stdout).toContain('# Templates')
  })

  it('returns usage errors for unknown commands', async () => {
    const { io } = memoryIo()
    expect(await runCli(['explode'], io)).toBe(2)
    expect(await runCli(['describe', 'nothing'], io)).toBe(1)
  })
})
