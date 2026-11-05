import type { DiagramModel } from '../model/DiagramModel'

export interface Command {
  readonly label: string
  execute(model: DiagramModel): void
  undo(model: DiagramModel): void
}
