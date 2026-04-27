const LIGHT_THEME_COLOR = '#f5f5f4'
const DARK_THEME_COLOR = '#09090b'

export function syncThemeChrome(isDark: boolean): void {
  if (typeof document === 'undefined') {
    return
  }

  const themeColor = isDark ? DARK_THEME_COLOR : LIGHT_THEME_COLOR

  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'
  document.documentElement.style.backgroundColor = themeColor
  document.body.style.backgroundColor = themeColor

  setMetaContent('theme-color', themeColor)
  setMetaContent('color-scheme', 'light dark')
}

function setMetaContent(name: string, content: string): void {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)

  if (!meta) {
    meta = document.createElement('meta')
    meta.name = name
    document.head.appendChild(meta)
  }

  meta.content = content
}
