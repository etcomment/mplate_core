export interface ParsedArguments {
  command?: string
  positionals: string[]
  options: Record<string, string | boolean>
}

const SHORT_OPTIONS: Record<string, string> = { o: 'output', t: 'theme', w: 'width', f: 'format', h: 'help', v: 'version' }
const VALUE_OPTIONS = new Set(['output', 'theme', 'width', 'format', 'scale', 'overrides'])

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
    const name = isLong ? rawName! : SHORT_OPTIONS[rawName!] ?? rawName!
    if (name.startsWith('no-')) {
      options[name.slice(3)] = false
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
