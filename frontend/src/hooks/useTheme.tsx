import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'auto'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'pagelm-theme'

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: Theme
}

export function ThemeProvider({ children, defaultTheme = 'auto' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored && (stored === 'light' || stored === 'dark' || stored === 'auto')) {
      return stored as Theme
    }
    return defaultTheme
  })

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    return getResolvedTheme(theme)
  })

  useEffect(() => {
    const root = document.documentElement
    const resolved = getResolvedTheme(theme)

    root.setAttribute('data-theme', resolved)
    setResolvedTheme(resolved)

    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

function getResolvedTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}
