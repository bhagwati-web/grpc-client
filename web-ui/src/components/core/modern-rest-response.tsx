import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "../ui/badge"
import CodeMirror from '@uiw/react-codemirror';
import { json } from "@codemirror/lang-json";
import { githubLight, githubDark } from '@uiw/codemirror-theme-github';
import { EditorView } from "@codemirror/view";
import { useTheme } from "@/providers/theme-provider";
import { 
    Copy, 
    Download, 
    Eye,
    EyeOff,
    Clock,
    FileText,
    Hash,
    CheckCircle2,
    AlertCircle,
    XCircle,
    WrapText,
    Minus
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface RestResponse {
    statusCode: number;
    status: string;
    headers: Record<string, string[]>;
    body: any;
    timing: {
        total: number;
        dns?: number;
        connection?: number;
        tls?: number;
        firstByte?: number;
    };
}

interface ModernRestResponseProps {
    response: RestResponse;
}

const getStatusColor = (statusCode: number): string => {
    if (statusCode >= 200 && statusCode < 300) return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800";
    if (statusCode >= 300 && statusCode < 400) return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800";
    if (statusCode >= 400 && statusCode < 500) return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800";
    if (statusCode >= 500) return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800";
    return "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950/50 border-gray-200 dark:border-gray-800";
};

const getStatusIcon = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) return <CheckCircle2 className="w-4 h-4" />;
    if (statusCode >= 400 && statusCode < 500) return <AlertCircle className="w-4 h-4" />;
    if (statusCode >= 500) return <XCircle className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
};

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const prettyPrintJson = (obj: any): string => {
    try {
        return JSON.stringify(obj, null, 2);
    } catch {
        return String(obj);
    }
};

export function ModernRestResponse({ response }: ModernRestResponseProps) {
    const [prettyPrint, setPrettyPrint] = useState(true);
    const [lineWrap, setLineWrap] = useState(true);
    const { theme } = useTheme();
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
    const [activeTab, setActiveTab] = useState("body");

    const copyToClipboard = (text: string, description: string) => {
        navigator.clipboard.writeText(text).then(() => {
            toast({
                title: "Copied!",
                description: `${description} copied to clipboard`,
            });
        });
    };

    const downloadResponse = () => {
        const dataStr = prettyPrint ? prettyPrintJson(response.body) : JSON.stringify(response.body);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'response.json';
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const responseSize = new Blob([JSON.stringify(response.body)]).size;
    const headerCount = Object.keys(response.headers).length;

    return (
        <div className="w-full bg-background border rounded-lg shadow-sm">
            {/* Response Status Header */}
            <div className="px-6 py-4 border-b bg-muted/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-medium ${getStatusColor(response.statusCode)}`}>
                            {getStatusIcon(response.statusCode)}
                            <span className="font-mono text-sm">{response.statusCode}</span>
                            <span className="text-sm">{response.status}</span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                <span className="font-mono">{response.timing.total}ms</span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                <span className="font-mono">{formatBytes(responseSize)}</span>
                            </div>
                            
                            <div className="flex items-center gap-1">
                                <Hash className="w-4 h-4" />
                                <span>{headerCount} headers</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPrettyPrint(!prettyPrint)}
                        >
                            {prettyPrint ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                            {prettyPrint ? 'Raw' : 'Pretty'}
                        </Button>
                        
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLineWrap(!lineWrap)}
                        >
                            {lineWrap ? <Minus className="w-4 h-4 mr-1" /> : <WrapText className="w-4 h-4 mr-1" />}
                            {lineWrap ? 'No Wrap' : 'Wrap'}
                        </Button>
                        
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(
                                prettyPrint ? prettyPrintJson(response.body) : JSON.stringify(response.body),
                                "Response body"
                            )}
                        >
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                        </Button>
                        
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={downloadResponse}
                        >
                            <Download className="w-4 h-4 mr-1" />
                            Save
                        </Button>
                    </div>
                </div>
            </div>

            {/* Response Tabs */}
            <div className="p-6">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4 h-auto bg-transparent p-0 space-x-0">
                        <TabsTrigger 
                            value="body"
                            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent"
                        >
                            Body
                        </TabsTrigger>
                        <TabsTrigger 
                            value="headers"
                            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent"
                        >
                            Headers
                            <Badge variant="secondary" className="ml-2 text-xs">
                                {headerCount}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="timing"
                            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent"
                        >
                            Timing
                        </TabsTrigger>
                        <TabsTrigger 
                            value="raw"
                            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none border-b-2 border-transparent"
                        >
                            Raw
                        </TabsTrigger>
                    </TabsList>

                    {/* Response Body */}
                    <TabsContent value="body" className="mt-6">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-foreground">Response Body</h4>
                                <div className="flex items-center gap-3">
                                    <div className="text-xs text-muted-foreground">
                                        {formatBytes(responseSize)}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyToClipboard(
                                            prettyPrint ? prettyPrintJson(response.body) : JSON.stringify(response.body),
                                            "Response body"
                                        )}
                                    >
                                        <Copy className="w-4 h-4 mr-1" />
                                        Copy
                                    </Button>
                                </div>
                            </div>
                            
                            <div className="w-full border border-border rounded-lg overflow-hidden">
                                <CodeMirror
                                    value={prettyPrint ? prettyPrintJson(response.body) : JSON.stringify(response.body)}
                                    extensions={[json(), ...(lineWrap ? [EditorView.lineWrapping] : [])]}
                                    theme={codeMirrorTheme}
                                    height="400px"
                                    width="100%"
                                    editable={false}
                                    basicSetup={{
                                        lineNumbers: true,
                                        foldGutter: true,
                                        dropCursor: false,
                                        allowMultipleSelections: false,
                                        indentOnInput: false,
                                        bracketMatching: true,
                                        closeBrackets: false,
                                        autocompletion: false,
                                        highlightSelectionMatches: true,
                                        searchKeymap: true,
                                    }}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    {/* Response Headers */}
                    <TabsContent value="headers" className="mt-6">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-foreground">Response Headers</h4>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(JSON.stringify(response.headers, null, 2), "Response headers")}
                                >
                                    <Copy className="w-4 h-4 mr-1" />
                                    Copy All
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {Object.entries(response.headers).map(([key, values]) => (
                                    <div key={key} className="grid grid-cols-3 gap-4 py-2 px-3 bg-muted rounded-lg">
                                        <div className="text-sm font-medium text-foreground font-mono">
                                            {key}
                                        </div>
                                        <div className="col-span-2 text-sm text-muted-foreground font-mono break-all">
                                            {Array.isArray(values) ? values.join(', ') : values}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {Object.keys(response.headers).length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    <p>No response headers</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* Timing Information */}
                    <TabsContent value="timing" className="mt-6">
                        <div className="space-y-4">
                            <h4 className="text-sm font-medium text-foreground">Request Timing</h4>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-muted rounded-lg p-4 text-center">
                                    <div className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
                                        {response.timing.total}ms
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">Total Time</div>
                                </div>
                                
                                {response.timing.dns !== undefined && (
                                    <div className="bg-muted rounded-lg p-4 text-center">
                                        <div className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">
                                            {response.timing.dns}ms
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">DNS Lookup</div>
                                    </div>
                                )}
                                
                                {response.timing.connection !== undefined && (
                                    <div className="bg-muted rounded-lg p-4 text-center">
                                        <div className="text-2xl font-mono font-bold text-orange-600 dark:text-orange-400">
                                            {response.timing.connection}ms
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">Connection</div>
                                    </div>
                                )}
                                
                                {response.timing.firstByte !== undefined && (
                                    <div className="bg-muted rounded-lg p-4 text-center">
                                        <div className="text-2xl font-mono font-bold text-purple-600 dark:text-purple-400">
                                            {response.timing.firstByte}ms
                                        </div>
                                        <div className="text-sm text-muted-foreground mt-1">First Byte</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    {/* Raw Response */}
                    <TabsContent value="raw" className="mt-6">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-foreground">Raw Response</h4>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(JSON.stringify(response, null, 2), "Raw response")}
                                >
                                    <Copy className="w-4 h-4 mr-1" />
                                    Copy
                                </Button>
                            </div>
                            
                            <div className="w-full border rounded-lg overflow-hidden">
                                <CodeMirror
                                    value={JSON.stringify(response, null, 2)}
                                    extensions={[json(), ...(lineWrap ? [EditorView.lineWrapping] : [])]}
                                    theme={codeMirrorTheme}
                                    height="400px"
                                    width="100%"
                                    editable={false}
                                    basicSetup={{
                                        lineNumbers: true,
                                        foldGutter: true,
                                        dropCursor: false,
                                        allowMultipleSelections: false,
                                        indentOnInput: false,
                                        bracketMatching: true,
                                        closeBrackets: false,
                                        autocompletion: false,
                                        highlightSelectionMatches: true,
                                        searchKeymap: true,
                                    }}
                                />
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}