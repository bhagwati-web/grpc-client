import { Moon, Sun, Monitor } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTheme } from "@/providers/theme-provider"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()

    const toggleTheme = () => {
        if (theme === "light") {
            setTheme("dark")
        } else if (theme === "dark") {
            setTheme("system")
        } else {
            setTheme("light")
        }
    }

    const getThemeIcon = () => {
        switch (theme) {
            case "light":
                return <Sun className="h-[1.2rem] w-[1.2rem]" />
            case "dark":
                return <Moon className="h-[1.2rem] w-[1.2rem]" />
            case "system":
                return <Monitor className="h-[1.2rem] w-[1.2rem]" />
            default:
                return <Sun className="h-[1.2rem] w-[1.2rem]" />
        }
    }

    const getThemeLabel = () => {
        switch (theme) {
            case "light":
                return "Switch to dark theme"
            case "dark":
                return "Switch to system theme"
            case "system":
                return "Switch to light theme"
            default:
                return "Toggle theme"
        }
    }

    return (
        <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleTheme}
            title={getThemeLabel()}
        >
            {getThemeIcon()}
            <span className="sr-only">{getThemeLabel()}</span>
        </Button>
    )
}