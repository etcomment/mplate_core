import type { Dimensions, Position, Shape, ShapeStyle, ShapeText } from '../model/Shape'
import type { ConnectionType, ShapeType} from '../model/Shape'
import type { ConnectionOptions, DiagramModel } from '../model/DiagramModel'
import type { Command } from './Command'
import { GroupShapesCommand, UngroupShapesCommand } from './GroupCommands'

export class History {
  private readonly model: DiagramModel
  private readonly undoStack: Command[] = []
  private readonly redoStack: Command[] = []

  constructor(model: DiagramModel) {
    this.model = model
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  undo(): void {
    const command = this.undoStack.pop()
    if (!command) return
    command.undo(this.model)
    this.redoStack.push(command)
  }

  redo(): void {
    const command = this.redoStack.pop()
    if (!command) return
    command.execute(this.model)
    this.undoStack.push(command)
  }

  private push(command: Command): void {
    this.undoStack.push(command)
    this.redoStack.length = 0
  }

  addShape(type: ShapeType, position: Position, dimensions: Dimensions, iconName?: string) {
    const shape = this.model.addShape(type, position, dimensions, iconName)
    const snapshot = shape
    this.push({
      label: `Ajouter ${type}`,
      execute: (model) => {
        model.restoreShape(snapshot)
      },
      undo: (model) => {
        model.removeShape(snapshot.id)
      },
    })
    return shape
  }

  removeShape(id: string): void {
    const shape = this.model.getShape(id)
    if (!shape) return
    const snapshot = shape
    this.model.removeShape(id)
    this.push({
      label: 'Supprimer forme',
      execute: (model) => {
        model.removeShape(id)
      },
      undo: (model) => {
        model.restoreShape(snapshot)
      },
    })
  }

  moveShape(id: string, position: Position): void {
    const shape = this.model.getShape(id)
    if (!shape) return
    const previousPosition = { ...shape.position }
    this.model.moveShape(id, position)
    this.push({
      label: 'Deplacer forme',
      execute: (model) => {
        model.moveShape(id, position)
      },
      undo: (model) => {
        model.moveShape(id, previousPosition)
      },
    })
  }

  resizeShape(id: string, dimensions: Dimensions): void {
    const shape = this.model.getShape(id)
    if (!shape) return
    const previousDimensions = { ...shape.dimensions }
    this.model.resizeShape(id, dimensions)
    this.push({
      label: 'Redimensionner forme',
      execute: (model) => {
        model.resizeShape(id, dimensions)
      },
      undo: (model) => {
        model.resizeShape(id, previousDimensions)
      },
    })
  }

  updateShapeStyle(id: string, style: Partial<ShapeStyle>): void {
    const shape = this.model.getShape(id)
    if (!shape) return
    const previousStyle = { ...shape.style }
    this.model.updateShapeStyle(id, style)
    this.push({
      label: 'Modifier style',
      execute: (model) => {
        model.updateShapeStyle(id, style)
      },
      undo: (model) => {
        model.updateShapeStyle(id, previousStyle)
      },
    })
  }

  updateShapeRotation(id: string, rotation: number): void {
    const shape = this.model.getShape(id)
    if (!shape) return
    const previousRotation = shape.rotation ?? 0
    this.model.updateShapeRotation(id, rotation)
    this.push({
      label: 'Pivoter forme',
      execute: (model) => {
        model.updateShapeRotation(id, rotation)
      },
      undo: (model) => {
        model.updateShapeRotation(id, previousRotation)
      },
    })
  }

  updateShapeText(id: string, text: Partial<ShapeText>): void {
    const shape = this.model.getShape(id)
    if (!shape) return
    const previousText = { ...shape.text }
    this.model.updateShapeText(id, text)
    this.push({
      label: 'Modifier texte',
      execute: (model) => {
        model.updateShapeText(id, text)
      },
      undo: (model) => {
        model.updateShapeText(id, previousText)
      },
    })
  }

  moveAndResizeShape(id: string, position: Position, dimensions: Dimensions): void {
    const shape = this.model.getShape(id)
    if (!shape) return
    const previousPosition = { ...shape.position }
    const previousDimensions = { ...shape.dimensions }
    this.model.moveAndResizeShape(id, position, dimensions)
    this.push({
      label: 'Redimensionner forme',
      execute: (model) => {
        model.moveAndResizeShape(id, position, dimensions)
      },
      undo: (model) => {
        model.moveAndResizeShape(id, previousPosition, previousDimensions)
      },
    })
  }

  setShapeHidden(id: string, isHidden: boolean): void {
    const shape = this.model.getShape(id)
    if (!shape) return
    const previousHidden = !!shape.isHidden
    this.model.setShapeHidden(id, isHidden)
    this.push({
      label: isHidden ? 'Masquer forme' : 'Afficher forme',
      execute: (model) => {
        model.setShapeHidden(id, isHidden)
      },
      undo: (model) => {
        model.setShapeHidden(id, previousHidden)
      },
    })
  }

  setShapeLocked(id: string, isLocked: boolean): void {
    const shape = this.model.getShape(id)
    if (!shape) return
    const previousLocked = !!shape.isLocked
    this.model.setShapeLocked(id, isLocked)
    this.push({
      label: isLocked ? 'Verrouiller forme' : 'Deverrouiller forme',
      execute: (model) => {
        model.setShapeLocked(id, isLocked)
      },
      undo: (model) => {
        model.setShapeLocked(id, previousLocked)
      },
    })
  }

  reorderShapes(orderedIds: readonly string[]): void {
    const previousOrder = this.model.shapes.map(s => s.id)
    this.model.reorderShapes(orderedIds)
    this.push({
      label: 'Reordonner calques',
      execute: (model) => {
        model.reorderShapes(orderedIds)
      },
      undo: (model) => {
        model.reorderShapes(previousOrder)
      },
    })
  }

  addConnection(sourceId: string, targetId: string, options?: ConnectionOptions): ConnectionType {
    const connection = this.model.addConnection(sourceId, targetId, options)
    const snapshot = connection
    this.push({
      label: 'Ajouter connexion',
      execute: (model) => {
        model.restoreConnection(snapshot)
      },
      undo: (model) => {
        model.removeConnection(snapshot.id)
      },
    })
    return connection
  }

  removeConnection(connectionId: string): void {
    const connection = this.model.connections.find(c => c.id === connectionId)
    if (!connection) return
    const snapshot = connection
    this.model.removeConnection(connectionId)
    this.push({
      label: 'Supprimer connexion',
      execute: (model) => {
        model.removeConnection(connectionId)
      },
      undo: (model) => {
        model.restoreConnection(snapshot)
      },
    })
  }

  groupShapes(shapeIds: string[]): string | null {
    if (shapeIds.length < 2) return null
    const command = new GroupShapesCommand(shapeIds)
    command.execute(this.model)
    this.push(command)
    return command.getGroupId()
  }

  ungroupShapes(groupId: string): void {
    const command = new UngroupShapesCommand(groupId)
    command.execute(this.model)
    this.push(command)
  }

  bringToFront(id: string): void {
    const shape = this.model.getShape(id)
    if (!shape) return
    const previousShapes = [...this.model.shapes]
    this.model.bringToFront(id)
    this.push({
      label: 'Mettre au premier plan',
      execute: (model) => {
        model.bringToFront(id)
      },
      undo: (model) => {
        this.restoreShapeOrder(model, previousShapes)
      },
    })
  }

  sendToBack(id: string): void {
    const shape = this.model.getShape(id)
    if (!shape) return
    const previousShapes = [...this.model.shapes]
    this.model.sendToBack(id)
    this.push({
      label: 'Mettre a l\'arriere-plan',
      execute: (model) => {
        model.sendToBack(id)
      },
      undo: (model) => {
        this.restoreShapeOrder(model, previousShapes)
      },
    })
  }

  bringForward(id: string): void {
    const shape = this.model.getShape(id)
    if (!shape) return
    const previousShapes = [...this.model.shapes]
    this.model.bringForward(id)
    this.push({
      label: 'Avancer la forme',
      execute: (model) => {
        model.bringForward(id)
      },
      undo: (model) => {
        this.restoreShapeOrder(model, previousShapes)
      },
    })
  }

  sendBackward(id: string): void {
    const shape = this.model.getShape(id)
    if (!shape) return
    const previousShapes = [...this.model.shapes]
    this.model.sendBackward(id)
    this.push({
      label: 'Reculer la forme',
      execute: (model) => {
        model.sendBackward(id)
      },
      undo: (model) => {
        this.restoreShapeOrder(model, previousShapes)
      },
    })
  }

  private restoreShapeOrder(model: DiagramModel, shapes: readonly Shape[]): void {
    const currentShapes = new Map(model.shapes.map(s => [s.id, s]))
    model.clear()
    for (const s of shapes) {
      const existing = currentShapes.get(s.id)
      if (existing) {
        model.restoreShape(existing)
      }
    }
  }
}
