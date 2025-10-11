import { useState, useEffect } from "react";
import CodeMirror from '@uiw/react-codemirror';
import { json } from "@codemirror/lang-json";
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { useTheme } from "@/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { 
    Copy, 
    Wand2, 
    CheckCircle, 
    AlertCircle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export type BodyType = "json" | "xml" | "html" | "raw" | "text";

interface RestBodyEditorProps {
    value: string;
    onChange: (value: string) => void;
    bodyType: BodyType;
    onBodyTypeChange: (type: BodyType) => void;
    height?: string;
    placeholder?: string;
}

const BODY_TYPES = [
    { value: "json" as BodyType, label: "JSON", icon: "{ }", extension: json },
    { value: "xml" as BodyType, label: "XML", icon: "< >", extension: null },
    { value: "html" as BodyType, label: "HTML", icon: "HTML", extension: null },
    { value: "raw" as BodyType, label: "Raw", icon: "RAW", extension: null },
    { value: "text" as BodyType, label: "Text", icon: "TXT", extension: null },
];

export function RestBodyEditor({ 
    value, 
    onChange, 
    bodyType, 
    onBodyTypeChange, 
    height = "300px",
    placeholder = "Enter request body..."
}: RestBodyEditorProps) {
    const { theme } = useTheme();
    const [isValid, setIsValid] = useState<boolean | null>(null);
    const [validationMessage, setValidationMessage] = useState<string>("");
    const [systemTheme, setSystemTheme] = useState<"light" | "dark">(
        window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    );

    // Listen for system theme changes
    useEffect(() => {
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

    // Get current body type config
    const currentBodyType = BODY_TYPES.find(type => type.value === bodyType) || BODY_TYPES[0];

    // Validate content based on type
    const validateContent = (content: string, type: BodyType) => {
        if (!content.trim()) {
            setIsValid(null);
            setValidationMessage("");
            return;
        }

        try {
            if (type === "json") {
                JSON.parse(content);
                setIsValid(true);
                setValidationMessage("Valid JSON");
            } else {
                setIsValid(true);
                setValidationMessage("Content looks good");
            }
        } catch (error) {
            setIsValid(false);
            if (type === "json") {
                setValidationMessage(`Invalid JSON: ${error instanceof Error ? error.message : 'Parse error'}`);
            } else {
                setValidationMessage("Content may have issues");
            }
        }
    };

    // Validate when value or type changes
    useEffect(() => {
        validateContent(value, bodyType);
    }, [value, bodyType]);

    // Format/Beautify content
    const formatContent = () => {
        try {
            if (bodyType === "json" && value.trim()) {
                const parsed = JSON.parse(value);
                const formatted = JSON.stringify(parsed, null, 2);
                onChange(formatted);
                toast({
                    title: "Success",
                    description: "JSON formatted successfully",
                });
            } else {
                toast({
                    title: "Info",
                    description: `Formatting not available for ${bodyType.toUpperCase()}`,
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: `Cannot format: ${error instanceof Error ? error.message : 'Invalid format'}`,
                variant: "destructive",
            });
        }
    };

    // Copy content to clipboard
    const copyContent = () => {
        navigator.clipboard.writeText(value).then(() => {
            toast({
                title: "Copied!",
                description: "Request body copied to clipboard",
            });
        });
    };

    // Get extensions for CodeMirror
    const getExtensions = () => {
        if (currentBodyType.extension) {
            return [currentBodyType.extension()];
        }
        return [];
    };

    return (
        <div className="space-y-3">
            {/* Header with controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Body Type:</label>
                        <Select value={bodyType} onValueChange={onBodyTypeChange}>
                            <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {BODY_TYPES.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono bg-gray-100 px-1 rounded">
                                                {type.icon}
                                            </span>
                                            {type.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Validation indicator */}
                    {isValid !== null && (
                        <div className="flex items-center gap-1 text-sm">
                            {isValid ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className={isValid ? "text-green-600" : "text-red-600"}>
                                {validationMessage}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {bodyType === "json" && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={formatContent}
                            disabled={!value.trim()}
                        >
                            <Wand2 className="w-4 h-4 mr-1" />
                            Format
                        </Button>
                    )}
                    
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={copyContent}
                        disabled={!value.trim()}
                    >
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                    </Button>
                </div>
            </div>

            {/* CodeMirror Editor */}
            <div className="relative border rounded-lg overflow-hidden">
                <CodeMirror
                    value={value}
                    onChange={(val) => onChange(val)}
                    extensions={getExtensions()}
                    theme={codeMirrorTheme}
                    height={height}
                    placeholder={placeholder}
                    basicSetup={{
                        lineNumbers: true,
                        foldGutter: true,
                        dropCursor: false,
                        allowMultipleSelections: false,
                        indentOnInput: true,
                        bracketMatching: true,
                        closeBrackets: true,
                        autocompletion: true,
                        highlightSelectionMatches: false,
                        searchKeymap: true,
                    }}
                />
                
                {/* Language indicator */}
                <div className="absolute bottom-2 right-2 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-mono text-gray-600 dark:text-gray-300">
                    {currentBodyType.label}
                </div>
            </div>

            {/* Content info */}
            {value.trim() && (
                <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                        <span>Lines: {value.split('\n').length}</span>
                        <span>Characters: {value.length}</span>
                        <span>Size: {new Blob([value]).size} bytes</span>
                    </div>
                </div>
            )}
        </div>
    );
}