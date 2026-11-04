#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import { runCli, type CliIo } from './run.js'

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)))
  return Buffer.concat(chunks).toString('utf8')
}

const io: CliIo = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
  readText: (path) => readFile(path, 'utf8'),
  readStdin,
  writeFile: (path, content) => writeFile(path, content),
}

runCli(process.argv.slice(2), io).then((code) => {
  process.exitCode = code
})
