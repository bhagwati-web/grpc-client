import React from "react";
import CodeMirror from '@uiw/react-codemirror';
import { json } from "@codemirror/lang-json";
import { useWidth } from "@/hooks/use-width";
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { useTheme } from "@/providers/theme-provider";


export function CodePreviewer({ response, readOnly, onDataChange, height }: { response: any, readOnly: boolean, onDataChange?: (value: any) => void, height?: string }) {
    const responseWrapper = React.useRef<HTMLDivElement>(null);
    const { theme } = useTheme();
    const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">(
        window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    );

    // Listen for system theme changes
    React.useEffect(() => {
        if (theme !== "system") return;

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            setSystemTheme(mediaQuery.matches ? "dark" : "light");
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [theme]);

    // Determine the actual theme to use
    const getEffectiveTheme = () => {
        if (theme === "system") {
            return systemTheme;
        }
        return theme;
    };

    const effectiveTheme = getEffectiveTheme();
    const codeMirrorTheme = effectiveTheme === "dark" ? githubDark : githubLight;

    return (
        <div className="grid w-full gap-2 rounded-xl border border-gray-300 overflow-hidden" ref={responseWrapper}>
            <CodeMirror
                value={JSON.stringify(response || {}, null, 2)} // Initial value
                extensions={[json()]} // JSON syntax highlighting
                theme={codeMirrorTheme} // Dynamic theme based on current theme
                readOnly={readOnly} // Make it read-only
                height={height} // Set the editor height
                width={`${useWidth(responseWrapper)}px`}// Set the editor width                                
                basicSetup={{
                    lineNumbers: true, // Show line numbers
                    foldGutter: true, // Enable folding
                }}
                onChange={(value) => onDataChange && onDataChange(value)} // Set the value to the state
            />
        </div>
    )
}