import { useState, useContext, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RestBodyEditor, type BodyType } from "./rest-body-editor";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext"
import { appConfig } from "@/config/config"
import { toast } from "@/hooks/use-toast"
import { 
    Send, 
    Plus, 
    Trash2, 
    Settings
} from "lucide-react"
import { RestActions } from "@/components/core/rest-actions"
// import { Switch } from "@/components/ui/switch"

interface RestHeader {
    key: string;
    value: string;
    enabled: boolean;
}

interface QueryParam {
    key: string;
    value: string;
    enabled: boolean;
}

const HTTP_METHODS = [
    { value: "GET", color: "text-blue-600 bg-blue-50 border-blue-200" },
    { value: "POST", color: "text-green-600 bg-green-50 border-green-200" },
    { value: "PUT", color: "text-orange-600 bg-orange-50 border-orange-200" },
    { value: "DELETE", color: "text-red-600 bg-red-50 border-red-200" },
    { value: "PATCH", color: "text-purple-600 bg-purple-50 border-purple-200" },
    { value: "HEAD", color: "text-gray-600 bg-gray-50 border-gray-200" },
    { value: "OPTIONS", color: "text-yellow-600 bg-yellow-50 border-yellow-200" }
];

export function ModernRestInput() {
    const {
        serverInfo,
        setServerInfo,
        loading,
        setLoading,
        setGrpcResponse
    } = useContext(GrpcContext) as GrpcContextProps;

    const [method, setMethod] = useState<string>("GET");
    const [url, setUrl] = useState<string>("");
    const [params, setParams] = useState<QueryParam[]>([]);
    const [headers, setHeaders] = useState<RestHeader[]>([
        { key: "Content-Type", value: "application/json", enabled: true }
    ]);
    const [body, setBody] = useState<string>("{}");
    const [bodyType, setBodyType] = useState<BodyType>("json");
    const [currentRequestId, setCurrentRequestId] = useState<string | undefined>(undefined);

    // Load saved REST request data from context
    useEffect(() => {
        if (serverInfo?.type === 'rest' && serverInfo?.restConfig) {
            const restConfig = serverInfo.restConfig;
            
            setMethod(restConfig.method || "GET");
            setUrl(restConfig.url || "");
            setCurrentRequestId(serverInfo.id);
            
            // Parse URL for query parameters
            try {
                const urlObj = new URL(restConfig.url || "");
                const urlParams: QueryParam[] = [];
                urlObj.searchParams.forEach((value, key) => {
                    urlParams.push({ key, value, enabled: true });
                });
                setParams(urlParams);
                // Set URL without query string for cleaner display
                setUrl(`${urlObj.origin}${urlObj.pathname}`);
            } catch {
                // If URL parsing fails, keep original URL
            }
            
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
                    setBodyType('text');
                } else {
                    setBody(JSON.stringify(restConfig.body, null, 2));
                    setBodyType('json');
                }
            } else {
                setBody("{}");
            }
        }
    }, [serverInfo]);

    const addParam = () => {
        setParams([...params, { key: "", value: "", enabled: true }]);
    };

    const removeParam = (index: number) => {
        setParams(params.filter((_, i) => i !== index));
    };

    const updateParam = (index: number, field: keyof QueryParam, value: string | boolean) => {
        const newParams = [...params];
        newParams[index] = { ...newParams[index], [field]: value };
        setParams(newParams);
    };

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

    const buildFullUrl = () => {
        let fullUrl = url;
        const enabledParams = params.filter(p => p.enabled && p.key);
        
        if (enabledParams.length > 0) {
            const queryString = enabledParams
                .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
                .join('&');
            fullUrl = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
        }
        
        return fullUrl;
    };

    const sendRestRequest = async () => {
        const fullUrl = buildFullUrl();
        
        if (!fullUrl) {
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
                if (bodyType === 'json') {
                    try {
                        parsedBody = JSON.parse(body);
                    } catch (e) {
                        throw new Error('Invalid JSON in request body');
                    }
                } else {
                    parsedBody = body;
                }
            }

            const restRequest = {
                method,
                url: fullUrl,
                headers: requestHeaders,
                body: parsedBody,
                timeout: 30
            };

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
                const urlObj = new URL(fullUrl);
                host = urlObj.host;
                pathname = urlObj.pathname;
            } catch {
                // If URL parsing fails, use fallback values
                host = fullUrl;
                pathname = fullUrl;
            }

            setServerInfo({
                ...serverInfo,
                host: host,
                method: `${method} ${pathname}`,
                type: 'rest',
                restConfig: {
                    method,
                    url: fullUrl,
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

    const methodConfig = HTTP_METHODS.find(m => m.value === method) || HTTP_METHODS[0];

    return (
        <div className="space-y-0 bg-white border rounded-lg shadow-sm">
            {/* Request URL Bar - Postman Style */}
            <div className="flex items-center gap-2 p-4 border-b bg-gray-50/50">
                <div className="w-28">
                    <Select value={method} onValueChange={setMethod}>
                        <SelectTrigger className={`h-10 border-2 font-medium ${methodConfig.color}`}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {HTTP_METHODS.map(m => (
                                <SelectItem key={m.value} value={m.value}>
                                    <span className={`font-medium ${m.color.split(' ')[0]}`}>
                                        {m.value}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="flex-1">
                    <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Enter request URL"
                        className="h-10 text-sm font-mono border-2 focus:border-blue-500"
                    />
                </div>

                <Button
                    onClick={sendRestRequest}
                    disabled={loading || !url}
                    className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                    <Send className="w-4 h-4 mr-2" />
                    {loading ? 'Sending...' : 'Send'}
                </Button>
            </div>

            {/* Request Configuration Tabs */}
            <div className="p-4">
                <Tabs defaultValue="params" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 h-auto bg-transparent p-0 space-x-0">
                        <TabsTrigger 
                            value="params" 
                            className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none border-b-2 border-transparent"
                        >
                            Params {params.filter(p => p.enabled && p.key).length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                    {params.filter(p => p.enabled && p.key).length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger 
                            value="headers"
                            className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none border-b-2 border-transparent"
                        >
                            Headers {headers.filter(h => h.enabled && h.key).length > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                    {headers.filter(h => h.enabled && h.key).length}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger 
                            value="body"
                            disabled={!["POST", "PUT", "PATCH"].includes(method)}
                            className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none border-b-2 border-transparent disabled:text-gray-400"
                        >
                            Body
                        </TabsTrigger>
                        <TabsTrigger 
                            value="settings"
                            className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none border-b-2 border-transparent"
                        >
                            <Settings className="w-4 h-4" />
                        </TabsTrigger>
                    </TabsList>

                    {/* Query Parameters */}
                    <TabsContent value="params" className="mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">Query parameters will be appended to the URL</p>
                        </div>
                        
                        {params.length > 0 && (
                            <div className="space-y-2">
                                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    <div className="col-span-1"></div>
                                    <div className="col-span-5">Key</div>
                                    <div className="col-span-5">Value</div>
                                    <div className="col-span-1"></div>
                                </div>
                                {params.map((param, index) => (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-center group">
                                        <div className="col-span-1 flex justify-center">
                                            <input
                                                type="checkbox"
                                                checked={param.enabled}
                                                onChange={(e) => updateParam(index, 'enabled', e.target.checked)}
                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                            />
                                        </div>
                                        <div className="col-span-5">
                                            <Input
                                                value={param.key}
                                                onChange={(e) => updateParam(index, 'key', e.target.value)}
                                                placeholder="Parameter name"
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="col-span-5">
                                            <Input
                                                value={param.value}
                                                onChange={(e) => updateParam(index, 'value', e.target.value)}
                                                placeholder="Parameter value"
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div className="col-span-1 flex justify-center">
                                            <Button
                                                onClick={() => removeParam(index)}
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {params.length === 0 && (
                            <div className="text-center py-8 text-gray-400">
                                <p>No query parameters added yet</p>
                                <p className="text-sm">Click "Add Param" to add query parameters</p>
                            </div>
                        )}

                        {/* Add Param button at bottom */}
                        <div className="flex justify-start pt-3 border-t">
                            <Button onClick={addParam} variant="outline" size="sm">
                                <Plus className="w-4 h-4 mr-1" />
                                Add Param
                            </Button>
                        </div>
                    </TabsContent>

                    {/* Headers */}
                    <TabsContent value="headers" className="mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">Headers will be sent with your request</p>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <div className="col-span-1"></div>
                                <div className="col-span-5">Key</div>
                                <div className="col-span-5">Value</div>
                                <div className="col-span-1"></div>
                            </div>
                            {headers.map((header, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 items-center group">
                                    <div className="col-span-1 flex justify-center">
                                        <input
                                            type="checkbox"
                                            checked={header.enabled}
                                            onChange={(e) => updateHeader(index, 'enabled', e.target.checked)}
                                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                        />
                                    </div>
                                    <div className="col-span-5">
                                        <Input
                                            value={header.key}
                                            onChange={(e) => updateHeader(index, 'key', e.target.value)}
                                            placeholder="Header name"
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="col-span-5">
                                        <Input
                                            value={header.value}
                                            onChange={(e) => updateHeader(index, 'value', e.target.value)}
                                            placeholder="Header value"
                                            className="h-8 text-sm"
                                        />
                                    </div>
                                    <div className="col-span-1 flex justify-center">
                                        <Button
                                            onClick={() => removeHeader(index)}
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add Header button at bottom */}
                        <div className="flex justify-start pt-3 border-t">
                            <Button onClick={addHeader} variant="outline" size="sm">
                                <Plus className="w-4 h-4 mr-1" />
                                Add Header
                            </Button>
                        </div>
                    </TabsContent>

                    {/* Request Body */}
                    <TabsContent value="body" className="mt-4">
                        <RestBodyEditor
                            value={body}
                            onChange={setBody}
                            bodyType={bodyType}
                            onBodyTypeChange={setBodyType}
                            height="300px"
                            placeholder={
                                bodyType === 'json' 
                                    ? '{\n  "key": "value"\n}' 
                                    : 'Enter request body...'
                            }
                        />
                    </TabsContent>

                    {/* Settings */}
                    <TabsContent value="settings" className="mt-4 space-y-4">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label>Request Timeout</Label>
                                    <p className="text-sm text-gray-500">Maximum time to wait for response</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        type="number" 
                                        className="w-20 h-8" 
                                        defaultValue={30}
                                        min={1}
                                        max={300}
                                    />
                                    <span className="text-sm text-gray-500">seconds</span>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Actions Bar */}
            <div className="px-4 py-3 bg-gray-50 border-t">
                <RestActions 
                    method={method}
                    url={buildFullUrl()}
                    headers={headers}
                    body={body}
                    loading={loading}
                    onSend={sendRestRequest}
                    currentRequestId={currentRequestId}
                    onRequestSaved={() => {
                        console.log('REST request saved');
                    }}
                    onRequestDeleted={() => {
                        setCurrentRequestId(undefined);
                        console.log('REST request deleted');
                    }}
                />
            </div>
        </div>
    );
}