import { useState, useContext, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext"
import { appConfig } from "@/config/config"
import { toast } from "@/hooks/use-toast"
import { Plus, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { RestActions } from "@/components/core/rest-actions"

interface RestHeader {
    key: string;
    value: string;
    enabled: boolean;
}

export function RestServerInput() {
    const {
        serverInfo,
        setServerInfo,
        loading,
        setLoading,
        setGrpcResponse
    } = useContext(GrpcContext) as GrpcContextProps;

    const [method, setMethod] = useState<string>("GET");
    const [url, setUrl] = useState<string>("");
    const [headers, setHeaders] = useState<RestHeader[]>([
        { key: "Content-Type", value: "application/json", enabled: true }
    ]);
    const [body, setBody] = useState<string>("{}");
    const [timeout, setTimeout] = useState<number>(30);
    const [currentRequestId, setCurrentRequestId] = useState<string | undefined>(undefined);

    const httpMethods = [
        "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"
    ];

    // Load saved REST request data from context
    useEffect(() => {
        if (serverInfo?.type === 'rest' && serverInfo?.restConfig) {
            const restConfig = serverInfo.restConfig;
            
            setMethod(restConfig.method || "GET");
            setUrl(restConfig.url || "");
            setCurrentRequestId(serverInfo.id);
            
            // Convert headers from array format to local format
            if (restConfig.headers && Array.isArray(restConfig.headers)) {
                setHeaders(restConfig.headers.map((h: any) => ({
                    key: h.key || '',
                    value: h.value || '',
                    enabled: h.enabled !== false
                })));
            }
            
            // Set body if it exists
            if (restConfig.body !== undefined) {
                if (typeof restConfig.body === 'string') {
                    setBody(restConfig.body);
                } else {
                    setBody(JSON.stringify(restConfig.body, null, 2));
                }
            } else {
                setBody("{}");
            }
        }
    }, [serverInfo]);

    const addHeader = () => {
        setHeaders([...headers, { key: "", value: "", enabled: true }]);
    };

    const removeHeader = (index: number) => {
        setHeaders(headers.filter((_, i) => i !== index));
    };

    const updateHeader = (index: number, field: keyof RestHeader, value: string | boolean) => {
        const newHeaders = [...headers];
        newHeaders[index] = { ...newHeaders[index], [field]: value };
        setHeaders(newHeaders);
    };

    const sendRestRequest = async () => {
        if (!url) {
            toast({
                title: "Error",
                description: "URL is required",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);

        try {
            // Build headers object from enabled headers
            const requestHeaders: Record<string, string> = {};
            headers.forEach(header => {
                if (header.enabled && header.key && header.value) {
                    requestHeaders[header.key] = header.value;
                }
            });

            // Parse body if it's a POST/PUT/PATCH request
            let parsedBody = null;
            if (["POST", "PUT", "PATCH"].includes(method) && body.trim()) {
                try {
                    parsedBody = JSON.parse(body);
                } catch (e) {
                    // If JSON parsing fails, send as string
                    parsedBody = body;
                }
            }

            const restRequest = {
                method,
                url,
                headers: requestHeaders,
                body: parsedBody,
                timeout: timeout > 0 ? timeout : 30
            };

            console.log('Sending REST request:', restRequest);

            const response = await fetch(`${appConfig.serviceBaseUrl}/rest/call`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(restRequest)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const responseData = await response.json();
            
            // Set the response in the context
            setGrpcResponse(responseData);

            // Update serverInfo to reflect current REST request
            let host = '';
            let pathname = '';
            try {
                const urlObj = new URL(url);
                host = urlObj.host;
                pathname = urlObj.pathname;
            } catch {
                // If URL parsing fails, use fallback values
                host = url;
                pathname = url;
            }

            setServerInfo({
                ...serverInfo,
                host: host,
                method: `${method} ${pathname}`,
                type: 'rest',
                restConfig: {
                    method,
                    url,
                    headers: headers.filter(h => h.enabled),
                    body: parsedBody
                }
            });

            toast({
                title: "Success",
                description: "REST request completed successfully",
            });

        } catch (error) {
            console.error('REST request failed:', error);
            toast({
                title: "Error",
                description: `REST request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>REST API Request</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Method and URL */}
                <div className="flex gap-2">
                    <div className="w-32">
                        <Label htmlFor="method">Method</Label>
                        <Select value={method} onValueChange={setMethod}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {httpMethods.map(m => (
                                    <SelectItem key={m} value={m}>
                                        {m}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex-1">
                        <Label htmlFor="url">URL</Label>
                        <Input
                            id="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://api.example.com/endpoint"
                        />
                    </div>

                    {/* REST Actions Component */}
                    <RestActions 
                        method={method}
                        url={url}
                        headers={headers}
                        body={body}
                        timeout={timeout}
                        loading={loading}
                        onSend={sendRestRequest}
                        currentRequestId={currentRequestId}
                        onRequestSaved={() => {
                            // Handle request saved - could refresh collections or update UI
                            console.log('REST request saved');
                        }}
                        onRequestDeleted={() => {
                            // Handle request deleted - clear current request
                            setCurrentRequestId(undefined);
                            console.log('REST request deleted');
                        }}
                    />
                </div>

                {/* Headers Section */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Headers</Label>
                        <Button onClick={addHeader} variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-1" />
                            Add Header
                        </Button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {headers.map((header, index) => (
                            <div key={index} className="flex gap-2 items-center">
                                <input
                                    type="checkbox"
                                    checked={header.enabled}
                                    onChange={(e) => updateHeader(index, 'enabled', e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <Input
                                    value={header.key}
                                    onChange={(e) => updateHeader(index, 'key', e.target.value)}
                                    placeholder="Header name"
                                    className="flex-1"
                                />
                                <Input
                                    value={header.value}
                                    onChange={(e) => updateHeader(index, 'value', e.target.value)}
                                    placeholder="Header value"
                                    className="flex-1"
                                />
                                <Button
                                    onClick={() => removeHeader(index)}
                                    variant="outline"
                                    size="sm"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Body Section (for POST/PUT/PATCH) */}
                {["POST", "PUT", "PATCH"].includes(method) && (
                    <div className="space-y-2">
                        <Label htmlFor="body">Request Body (JSON)</Label>
                        <Textarea
                            id="body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder='{"key": "value"}'
                            className="min-h-[100px] font-mono text-sm"
                        />
                    </div>
                )}

                {/* Advanced Options */}
                <div className="flex gap-4 pt-2 border-t">
                    <div>
                        <Label htmlFor="timeout">Timeout (seconds)</Label>
                        <Input
                            id="timeout"
                            type="number"
                            value={timeout}
                            onChange={(e) => setTimeout(parseInt(e.target.value) || 30)}
                            className="w-24"
                            min="1"
                            max="300"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}