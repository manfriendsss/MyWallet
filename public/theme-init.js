// Runs before first paint so the browser chrome (status bar, Android navigation bar)
// starts in the saved theme instead of flashing the manifest's dark colour.
// External file because the CSP forbids inline scripts. Colours mirror ThemeContext.
;(function () {
  var theme = 'dark'
  try {
    theme = localStorage.getItem('mywallet_theme') || 'dark'
  } catch (e) {}
  var isDark = theme === 'system' ? window.matchMedia('(prefers-color-scheme: dark)').matches : theme !== 'light'
  var root = document.documentElement
  root.classList.toggle('dark', isDark)
  root.style.colorScheme = isDark ? 'dark' : 'light'
  var color = isDark ? '#2d2621' : '#f8f5f1'
  var meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', color)
  var scheme = document.querySelector('meta[name="color-scheme"]')
  if (scheme) scheme.setAttribute('content', isDark ? 'dark' : 'light')
})()
