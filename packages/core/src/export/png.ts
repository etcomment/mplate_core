export interface PngOptions {
  scale?: number
  fontFiles?: string[]
}

interface ResvgModule {
  Resvg: new (svg: string, options: Record<string, unknown>) => { render(): { asPng(): Uint8Array } }
}

async function loadResvg(): Promise<ResvgModule> {
  try {
    const moduleName = '@resvg/resvg-js'
    return (await import(moduleName)) as ResvgModule
  } catch {
    throw new Error('PNG export needs the optional dependency @resvg/resvg-js. Install it with: npm install @resvg/resvg-js')
  }
}

const MIN_SCALE = 0.25
const MAX_SCALE = 8

export async function svgToPng(svg: string, options: PngOptions = {}): Promise<Uint8Array> {
  const scale = options.scale ?? 2
  if (!Number.isFinite(scale) || scale < MIN_SCALE || scale > MAX_SCALE) {
    throw new Error(`PNG export scale must be a finite number between ${MIN_SCALE} and ${MAX_SCALE}`)
  }
  const { Resvg } = await loadResvg()
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'zoom', value: scale },
    font: { loadSystemFonts: true, fontFiles: options.fontFiles ?? [], defaultFontFamily: 'Arial' },
  })
  return resvg.render().asPng()
}
