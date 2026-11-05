# @mplate/core

Designer-grade, parametric infographics from a few lines of text: the mplate DSL, a dependency-free SVG rendering engine, the `mplate` CLI and the `mplate-mcp` server for AI assistants.

```bash
npm install @mplate/core
npm install @resvg/resvg-js   # optional, PNG export
```

```ts
import { render } from '@mplate/core'

const { svg, diagnostics } = render(`@process style:chevrons "Delivery approach"
  step "Discover" "Interviews and current-state review" icon:search
  step "Design" "Target operating model" icon:pen-tool
  step "Build" "Iterative sprints" icon:hammer`)
```

```bash
npx mplate render roadmap.mplate -o roadmap.svg
npx mplate list
npx -y -p @mplate/core mplate-mcp     # MCP server over stdio
```

Documentation, template catalogue and the free online studio: https://github.com/etcomment/mplate_core

Licence: Apache 2.0. Icons from Lucide (ISC).
