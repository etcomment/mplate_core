import type { TemplateRegistry } from '../templates/lookup.js'
import type { ThemeCatalog } from '../theme/resolve.js'

export interface Engine {
  registry: TemplateRegistry
  themes: ThemeCatalog
}
