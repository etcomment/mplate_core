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

export async function svgToPng(svg: string, options: PngOptions = {}): Promise<Uint8Array> {
  const { Resvg } = await loadResvg()
  const scale = options.scale ?? 2
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'zoom', value: scale },
    font: { loadSystemFonts: true, fontFiles: options.fontFiles ?? [], defaultFontFamily: 'Arial' },
  })
  return resvg.render().asPng()
}
