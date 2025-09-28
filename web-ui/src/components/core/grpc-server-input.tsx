
import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext"
import { appConfig } from "@/config/config"
import { getReflections, saveReflections, saveGrpcResponse, normalizeHost, saveMethodData, getMethodData, getDefaultMethodData, getMethodDataWithCollection } from "@/utils/app-utils"
import { toast } from "@/hooks/use-toast"
import { useGrpcRequest } from "@/hooks/use-grpc-request"
import { Send, RefreshCw } from "lucide-react"

export function GrpcServerInput() {
    const {
        serverInfo,
        setServerInfo,
        collection
    } = React.useContext(GrpcContext) as GrpcContextProps;

    const { sendGrpcRequest, loading, setLoading } = useGrpcRequest();
    const [reflections, setReflections] = React.useState([]);
    const [methodName, setMethodName] = React.useState('');
    const debounceRef = React.useRef<number | undefined>(undefined);
    const { host, method } = serverInfo;


    React.useEffect(() => {
        // Clear previous timeout
        if (debounceRef.current) {
            window.clearTimeout(debounceRef.current);
        }

        // Only debounce if we have a host value
        if (host && host.trim() !== '') {
            // Debounce the API call with 800ms delay
            debounceRef.current = window.setTimeout(() => {
                fetchGrpcReflections({ preventDefault: () => { } }, false);
            }, 800);
        } else {
            // Clear reflections if host is empty
            setReflections([]);
        }

        // Cleanup function to clear timeout
        return () => {
            if (debounceRef.current) {
                window.clearTimeout(debounceRef.current);
            }
        };
    }, [host]);

    React.useEffect(() => {
        setServerInfo((prev: any) => ({ ...prev, method: methodName }))
    }, [methodName]);

    // Auto-save current method data when metadata or message changes
    React.useEffect(() => {
        if (host && method && (serverInfo.metaData || serverInfo.message)) {
            // Debounce the save operation to avoid excessive storage writes
            const saveTimeout = setTimeout(() => {
                saveMethodData(host, method, serverInfo.metaData || {}, serverInfo.message || {});
            }, 1000); // Save after 1 second of inactivity

            return () => clearTimeout(saveTimeout);
        }
    }, [host, method, serverInfo.metaData, serverInfo.message]);

    const handleHostChange = (e: any) => {
        const newHost = e.target.value;

        // Save current method data if switching hosts
        if (host && method && (serverInfo.metaData || serverInfo.message)) {
            saveMethodData(host, method, serverInfo.metaData || {}, serverInfo.message || {});
        }

        // Reset method selection when host changes
        setMethodName('');

        // Reset to default data when changing hosts
        const defaultData = getDefaultMethodData();
        setServerInfo((prev: any) => ({
            ...prev,
            host: newHost,
            method: '',
            metaData: defaultData.metaData,
            message: defaultData.message
        }));
    };

    const handleMethodChange = (value: string) => {
        if (value || value !== '') {
            // Save current method data before switching (if we have current method and host)
            if (host && method && (serverInfo.metaData || serverInfo.message)) {
                saveMethodData(host, method, serverInfo.metaData || {}, serverInfo.message || {});
            }

            // Check if we have stored data or collection data for the new method
            const methodData = getMethodDataWithCollection(host, value, collection);
            const hasStoredData = getMethodData(host, value) !== null;
            const isDefaultData = !hasStoredData &&
                (!methodData.metaData || Object.keys(methodData.metaData).length === 0) &&
                (!methodData.message || (typeof methodData.message === 'object' && Object.keys(methodData.message).length === 0));

            // Load the data (from session, collection, or defaults)
            setServerInfo((prev: any) => ({
                ...prev,
                method: value,
                metaData: methodData.metaData,
                message: methodData.message
            }));

            // Show appropriate feedback
            if (hasStoredData) {
                toast({
                    title: "Method Data Loaded",
                    description: "Restored your previous metadata and message for this method"
                });
            } else if (!isDefaultData) {
                toast({
                    title: "Collection Data Loaded",
                    description: "Loaded metadata and message from saved collection"
                });
            } else {
                toast({
                    title: "Method Reset",
                    description: "Started fresh with default metadata and empty message"
                });
            }

            setMethodName(value);
        }
    };

    const fetchGrpcReflections = async (e: any, forceFetch: boolean) => {
        e.preventDefault()
        setLoading(true);
        if (!host || host === '') {
            setLoading(false);
            return;
        }

        // Normalize the host by removing protocol prefixes
        const normalizedHost = normalizeHost(host);

        const localReflections = getReflections(normalizedHost);

        if (localReflections && !forceFetch) {
            setReflections(localReflections)
            setLoading(false);
            return;
        }
        const serviceUrl = `${appConfig.serviceBaseUrl + appConfig.grpcMetaData}/${encodeURIComponent(normalizedHost)}`
        const response = await fetch(serviceUrl);
        const data = await response.json()
        if (response.status !== 200) {
            toast({ title: "Error!", description: data?.error || 'Failed to fetch reflections, please check the endpoint and ensure it supports gRPC reflections', variant: "destructive" })
            setLoading(false);
            return;
        }

        if (!data || data.length === 0) {
            toast({ title: "Error!", description: "No reflections found, possible network error or host does not support gRPC reflections", variant: "destructive" })
            setLoading(false);
            return;
        }

        if (data.error) {
            toast({ title: "Error!", description: data?.error, variant: "destructive" })
            setLoading(false);
            return;
        }

        setReflections(data)
        saveReflections(normalizedHost, data)
        setLoading(false);
    }

    return (
        <div className="server-inputs relative">
            <form>
                <div className="grid w-full gap-4">
                    <div className="flex flex-col space-y-2">
                        <div className="space-y-4">
                            {/* Host Input and Send Button Row */}
                            <div className="flex items-end gap-2">
                                <div className="flex-1 min-w-0">
                                    <Label htmlFor="hostInput">1. Enter gRPC endpoint</Label>
                                    <Input
                                        className={reflections.length > 0 ? "rounded-tr-none rounded-br-none" : ""}
                                        id="hostInput"
                                        value={host ? host : ''}
                                        onChange={handleHostChange}
                                        type="text"
                                        placeholder="Please enter gRPC endpoint"
                                    />
                                </div>
                                {/* Send Button - Fixed width, always in top row */}
                                {reflections.length > 0 && method && (
                                    <div className="flex-shrink-0">
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            disabled={!method || loading}
                                            onClick={() => sendGrpcRequest({
                                                cacheResponse: true,
                                                successMessage: "Request sent successfully",
                                                saveGrpcResponse: saveGrpcResponse
                                            })}
                                            className="rounded-tl-none rounded-bl-none px-4"
                                        >
                                            <Send className="h-4 w-4 mr-1" />
                                            {loading ? 'Sending...' : 'Send'}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Method Selection Row - Constrained width */}
                            {reflections.length > 0 && (
                                <div className="w-full">
                                    <div className="flex items-center justify-between mb-2">
                                        <Label htmlFor="framework">2. Select a Method</Label>
                                        <Button variant="link" className="h-auto p-0 text-sm" onClick={(event) => fetchGrpcReflections(event, true)} type="button" disabled={loading}>
                                            <RefreshCw />
                                            {loading ? 'Loading...' : 'Fetch/Refetch the methods'}
                                        </Button>
                                    </div>
                                    <div className="w-full max-w-2xl">
                                        <Select onValueChange={handleMethodChange} value={method}>
                                            <SelectTrigger
                                                id="framework"
                                                className="w-full text-left"
                                            >
                                                <div className="truncate w-full overflow-hidden">
                                                    {method ? (
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="font-medium truncate">
                                                                {method.split('.').pop()}
                                                            </span>
                                                            <span className="text-xs text-gray-500 truncate">
                                                                {method}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <SelectValue placeholder="Select Method" />
                                                    )}
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent
                                                position="popper"
                                                className="w-[500px] max-w-[85vw] z-50"
                                                sideOffset={4}
                                            >
                                                <div className="max-h-[300px] overflow-auto">
                                                    {
                                                        reflections.map((service: any, serviceIndex: number) => (
                                                            <SelectGroup key={`${service.title}-${service.serviceName}-service-${serviceIndex}`}>
                                                                <SelectLabel className="text-xs font-semibold truncate" title={service.serviceName}>
                                                                    {service.serviceName}
                                                                </SelectLabel>
                                                                {
                                                                    service.methods.map((method: any, functionIndex: number) => (
                                                                        <SelectItem
                                                                            key={`${service.title}-${service.serviceName}-service-${serviceIndex}-${method.fullName}-${functionIndex}`}
                                                                            value={method.fullName}
                                                                            className="cursor-pointer"
                                                                        >
                                                                            <div className="flex flex-col min-w-0 w-full">
                                                                                <div className="font-medium truncate" title={method.name}>
                                                                                    {method.name}
                                                                                </div>
                                                                                <small className="text-gray-500 truncate text-xs" title={method.fullName}>
                                                                                    {method.fullName}
                                                                                </small>
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))
                                                                }
                                                                {serviceIndex < reflections.length - 1 && <hr className="my-1" />}
                                                            </SelectGroup>
                                                        ))
                                                    }
                                                </div>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </div>
                        {!host && <div className="mt-3 p-3 border rounded-lg">
                            <p>
                                <small className="leading-relaxed">
                                    <strong>Getting Started:</strong> Enter a gRPC endpoint to begin (e.g., <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-800">example.com:443</code>).
                                    The app will automatically fetch available <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-800">services</code> and <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-800">methods</code>.
                                    If auto-discovery fails, correct the url and try specifying a different port by appending it to the endpoint.
                                </small>
                            </p>
                            <p>
                                <small className="leading-relaxed">
                                    To stop it simply run the <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-800">grpcstop</code> command in your terminal anywhere to gracefully stop the server, it does not require any specific directory or terminal where you have started the server.
                                </small>
                            </p>
                        </div>}
                    </div>
                </div>
            </form>
        </div>
    )
}
