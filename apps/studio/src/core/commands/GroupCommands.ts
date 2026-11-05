import type { Command } from './Command'
import type { DiagramModel } from '../model/DiagramModel'

export class GroupShapesCommand implements Command {
  readonly label = 'Grouper les formes'
  private readonly shapeIds: string[]
  private groupId: string | null = null

  constructor(shapeIds: string[], groupId?: string) {
    this.shapeIds = [...shapeIds]
    if (groupId) {
      this.groupId = groupId
    }
  }

  getGroupId(): string | null {
    return this.groupId
  }

  execute(model: DiagramModel): void {
    if (this.shapeIds.length < 2) return
    this.groupId = model.groupShapes(this.shapeIds, this.groupId ?? undefined)
  }

  undo(model: DiagramModel): void {
    if (this.groupId) {
      model.ungroupShapes(this.groupId)
    }
  }
}

export class UngroupShapesCommand implements Command {
  readonly label = 'Dégrouper les formes'
  private readonly groupId: string
  private shapeIds: string[] = []

  constructor(groupId: string) {
    this.groupId = groupId
  }

  execute(model: DiagramModel): void {
    this.shapeIds = model.ungroupShapes(this.groupId)
  }

  undo(model: DiagramModel): void {
    if (this.shapeIds.length > 0) {
      model.groupShapes(this.shapeIds, this.groupId)
    }
  }
}
