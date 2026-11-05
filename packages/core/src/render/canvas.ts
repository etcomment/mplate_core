import type { Diagnostic } from '../dsl/types.js'
import { renderIcon } from '../icons/index.js'
import { element, type Attributes, type SvgElement } from '../svg/node.js'
import type { Box } from '../svg/paths.js'
import { measureText } from '../text/metrics.js'
import { fitText } from '../text/wrap.js'
import type { ResolvedTheme } from '../theme/resolve.js'
import type { Offset } from './overrides.js'

export type TextAlign = 'start' | 'middle' | 'end'
export type VerticalAlign = 'top' | 'middle' | 'bottom'

export interface TextOptions {
  text: string
  x: number
  y: number
  width: number
  size: number
  height?: number
  weight?: number
  color?: string
  align?: TextAlign
  valign?: VerticalAlign
  maxLines?: number
  minSize?: number
  font?: 'heading' | 'body'
  lineHeight?: number
  owner?: string
}

export interface TextBox extends Box {
  owner: string
  text: string
  isTruncated: boolean
}

const BASELINE_RATIO = 0.78

export class Canvas {
  readonly theme: ResolvedTheme
  readonly width: number
  readonly padding: number
  readonly diagnostics: Diagnostic[]
  readonly textBoxes: TextBox[] = []
  readonly elementIds: string[] = []
  top: number
  height: number
  private readonly root: SvgElement = element('g', { 'data-mplate-layer': 'content' })
  private readonly stack: SvgElement[] = [this.root]
  private readonly ownerStack: string[] = ['root']
  private readonly offsets: Map<string, Offset>

  constructor(theme: ResolvedTheme, width: number, diagnostics: Diagnostic[], padding: number = 48, offsets: Map<string, Offset> = new Map()) {
    this.offsets = offsets
    this.theme = theme
    this.width = width
    this.padding = padding
    this.diagnostics = diagnostics
    this.top = padding
    this.height = padding * 2
  }

  get contentWidth(): number {
    return this.width - this.padding * 2
  }

  get left(): number {
    return this.padding
  }

  get content(): SvgElement {
    return this.root
  }

  add(node: SvgElement): SvgElement {
    this.stack[this.stack.length - 1]!.children.push(node)
    return node
  }

  group(id: string, draw: () => void, attributes: Attributes = {}): void {
    const offset = this.offsets.get(id)
    const transform = offset ? `translate(${offset.dx.toFixed(2)} ${offset.dy.toFixed(2)})` : undefined
    const node = this.add(element('g', { 'data-mplate-id': id, transform, ...attributes }))
    this.elementIds.push(id)
    this.stack.push(node)
    this.ownerStack.push(id)
    const firstBox = this.textBoxes.length
    try {
      draw()
    } finally {
      this.stack.pop()
      this.ownerStack.pop()
    }
    if (offset) this.shiftTextBoxes(firstBox, offset)
  }

  private shiftTextBoxes(firstBox: number, offset: Offset): void {
    for (const box of this.textBoxes.slice(firstBox)) {
      box.x += offset.dx
      box.y += offset.dy
      this.extendHeight(box.y + box.height)
    }
  }

  rect(box: Box, attributes: Attributes = {}): SvgElement {
    return this.add(element('rect', { x: box.x, y: box.y, width: Math.max(0, box.width), height: Math.max(0, box.height), ...attributes }))
  }

  path(d: string, attributes: Attributes = {}): SvgElement {
    return this.add(element('path', { d, ...attributes }))
  }

  circle(cx: number, cy: number, r: number, attributes: Attributes = {}): SvgElement {
    return this.add(element('circle', { cx, cy, r: Math.max(0, r), ...attributes }))
  }

  line(x1: number, y1: number, x2: number, y2: number, attributes: Attributes = {}): SvgElement {
    return this.add(element('line', { x1, y1, x2, y2, ...attributes }))
  }

  icon(name: string, cx: number, cy: number, size: number, color: string): boolean {
    const node = renderIcon(name, cx, cy, size, color)
    if (!node) return false
    this.add(node)
    return true
  }

  extendHeight(bottom: number): void {
    this.height = Math.max(this.height, bottom + this.padding)
  }

  verticalText(text: string, centerX: number, centerY: number, size: number, color: string, weight: number = 700): TextBox {
    const length = measureText(text, size, weight)
    const box: TextBox = { x: centerX - size * 0.6, y: centerY - length / 2, width: size * 1.2, height: length, owner: this.ownerStack[this.ownerStack.length - 1]!, text, isTruncated: false }
    this.textBoxes.push(box)
    this.add(
      element(
        'text',
        { x: centerX, y: centerY + size * 0.35, transform: `rotate(-90 ${centerX.toFixed(2)} ${centerY.toFixed(2)})`, 'text-anchor': 'middle', 'font-size': size, 'font-weight': weight, fill: color, 'font-family': this.theme.fonts.body },
        [text],
      ),
    )
    return box
  }

  measure(options: TextOptions): { width: number; height: number } {
    if (options.text.trim() === '') return { width: 0, height: 0 }
    const fitted = this.fit(options)
    return { width: fitted.width, height: fitted.height }
  }

  private fit(options: TextOptions): ReturnType<typeof fitText> {
    return fitText(options.text, {
      maxWidth: Math.max(1, options.width),
      fontSize: options.size,
      minFontSize: options.minSize ?? options.size,
      maxLines: options.maxLines,
      maxHeight: options.height,
      weight: options.weight ?? 400,
      lineHeight: options.lineHeight,
    })
  }

  text(options: TextOptions): TextBox {
    const weight = options.weight ?? 400
    const fitted = this.fit(options)
    const align = options.align ?? 'start'
    const valign = options.valign ?? 'top'
    const boxHeight = options.height ?? fitted.height
    let top = options.y
    if (valign === 'middle') top = options.y + (boxHeight - fitted.height) / 2
    else if (valign === 'bottom') top = options.y + boxHeight - fitted.height
    const anchorX = align === 'middle' ? options.x + options.width / 2 : align === 'end' ? options.x + options.width : options.x
    const left = align === 'middle' ? anchorX - fitted.width / 2 : align === 'end' ? anchorX - fitted.width : anchorX
    const owner = options.owner ?? this.ownerStack[this.ownerStack.length - 1]!
    const textBox: TextBox = { x: left, y: top, width: fitted.width, height: fitted.height, owner, text: options.text, isTruncated: fitted.isTruncated }
    if (fitted.lines.length === 0 || options.text.trim() === '') return { ...textBox, height: 0, width: 0 }
    this.textBoxes.push(textBox)
    const firstBaseline = top + (fitted.lineHeight - fitted.fontSize) / 2 + fitted.fontSize * BASELINE_RATIO
    const spans = fitted.lines.map((line, index) =>
      element('tspan', { x: anchorX, y: firstBaseline + index * fitted.lineHeight }, [line]),
    )
    this.add(
      element(
        'text',
        {
          'font-family': options.font === 'heading' ? this.theme.fonts.heading : this.theme.fonts.body,
          'font-size': fitted.fontSize,
          'font-weight': weight === 400 ? undefined : weight,
          fill: options.color ?? this.theme.colors.text,
          'text-anchor': align === 'start' ? undefined : align,
        },
        spans,
      ),
    )
    return textBox
  }
}
