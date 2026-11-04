#!/usr/bin/env node
import { writeFile } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { isJsonRpcRequest, McpServer } from './server.js'

const server = new McpServer({ writeFile: (path, content) => writeFile(path, content) })
const lines = createInterface({ input: process.stdin, crlfDelay: Infinity })

function send(message: unknown): void {
  process.stdout.write(JSON.stringify(message) + '\n')
}

lines.on('line', (line) => {
  if (line.trim() === '') return
  let message: unknown
  try {
    message = JSON.parse(line)
  } catch {
    send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })
    return
  }
  const messages = Array.isArray(message) ? message : [message]
  for (const entry of messages) {
    if (!isJsonRpcRequest(entry)) continue
    void server.handle(entry).then((response) => {
      if (response) send(response)
    })
  }
})
