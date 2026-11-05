import { createCssVariables, theme } from '../lib/theme'

const GLOBAL_STYLE_ID = 'ad-theme-vars'

export function injectThemeVariables(): void {
  if (document.getElementById(GLOBAL_STYLE_ID)) return

  const variables = createCssVariables(theme)
  const css = `:root{${Object.entries(variables)
    .map(([name, value]) => `--${name}:${value}`)
    .join(';')}}`

  const style = document.createElement('style')
  style.id = GLOBAL_STYLE_ID
  style.textContent = css
  document.head.appendChild(style)
}

export const globalStyles: string = `
* {
  box-sizing: border-box;
}
html, body, #root {
  height: 100%;
  margin: 0;
  padding: 0;
}
body {
  font-family: ${theme.font.sans};
  font-size: ${theme.font.sizeMd};
  color: ${theme.color.textPrimary};
  background: ${theme.color.bgCanvas};
  -webkit-font-smoothing: antialiased;
}
button, input, textarea, select {
  font-family: inherit;
}
::selection {
  background: ${theme.color.selection};
}
.ad-toolbar-scroll::-webkit-scrollbar {
  display: none;
}
.ad-toolbar-scroll {
  -ms-overflow-style: none;
}
@media (max-width: 768px) {
  .ad-toolbar-scroll > * {
    flex-shrink: 0;
  }
}
@keyframes ad-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes ad-slide-in-left {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
@keyframes ad-slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
`
