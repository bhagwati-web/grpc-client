import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey) as Theme
      if (stored) {
        return stored
      } else {
        // If no theme is stored, set the default and save it
        localStorage.setItem(storageKey, defaultTheme)
        return defaultTheme
      }
    }
    return defaultTheme
  })

  useEffect(() => {
    const root = window.document.documentElement

    // Remove all theme classes and reset attributes
    root.classList.remove("light", "dark")
    root.removeAttribute("data-theme")
    
    // Force override any system preferences
    root.style.colorScheme = ""

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      root.setAttribute("data-theme", systemTheme)
      root.style.colorScheme = systemTheme
      return
    }

    // Explicitly set the chosen theme
    root.classList.add(theme)
    root.setAttribute("data-theme", theme)
    root.style.colorScheme = theme
  }, [theme])

  // Listen for system theme changes when using "system" theme
  useEffect(() => {
    if (theme !== "system") return

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    
    const handleChange = () => {
      const root = window.document.documentElement
      root.classList.remove("light", "dark")
      root.removeAttribute("data-theme")
      
      const systemTheme = mediaQuery.matches ? "dark" : "light"
      root.classList.add(systemTheme)
      root.setAttribute("data-theme", systemTheme)
      root.style.colorScheme = systemTheme
    }

    // Listen for changes
    mediaQuery.addEventListener("change", handleChange)

    // Cleanup
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [theme])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}