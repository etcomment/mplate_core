import { copyFileSync } from 'node:fs'

for (const name of ['LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md']) {
  copyFileSync(new URL(`../../../${name}`, import.meta.url), new URL(`../${name}`, import.meta.url))
}
