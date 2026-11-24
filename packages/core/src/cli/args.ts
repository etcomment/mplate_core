export interface ParsedArguments {
  command?: string
  positionals: string[]
  options: Record<string, string | boolean>
}

const SHORT_OPTIONS: Record<string, string> = { o: 'output', t: 'theme', w: 'width', f: 'format', h: 'help', v: 'version' }
const VALUE_OPTIONS = new Set(['output', 'theme', 'width', 'format', 'scale', 'overrides', 'brand'])
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function parseArguments(argv: string[]): ParsedArguments {
  const positionals: string[] = []
  const options: Record<string, string | boolean> = {}
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index]!
    if (argument === '-' || !argument.startsWith('-')) {
      positionals.push(argument)
      continue
    }
    const isLong = argument.startsWith('--')
    const [rawName, inlineValue] = argument.slice(isLong ? 2 : 1).split(/=(.*)/s, 2)
    const key = rawName ?? ''
    const name = isLong ? key : Object.hasOwn(SHORT_OPTIONS, key) ? SHORT_OPTIONS[key]! : key
    if (DANGEROUS_KEYS.has(name)) continue
    if (name.startsWith('no-')) {
      const target = name.slice(3)
      if (!DANGEROUS_KEYS.has(target)) options[target] = false
      continue
    }
    if (VALUE_OPTIONS.has(name)) {
      const value = inlineValue ?? argv[index + 1]
      if (inlineValue === undefined) index++
      options[name] = value ?? ''
    } else options[name] = inlineValue ?? true
  }
  const [command, ...rest] = positionals
  return command === undefined ? { positionals: rest, options } : { command, positionals: rest, options }
}
