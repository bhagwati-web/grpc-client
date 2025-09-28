
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
import { getReflections, saveReflections, saveGrpcResponse, normalizeHost } from "@/utils/app-utils"
import { toast } from "@/hooks/use-toast"
import { useGrpcRequest } from "@/hooks/use-grpc-request"
import { Send, RefreshCw } from "lucide-react"

export function GrpcServerInput() {
    const {
        serverInfo,
        setServerInfo
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

    const handleHostChange = (e: any) => {
        setServerInfo((prev: any) => ({ ...prev, host: e.target.value }))
    };

    const handleMethodChange = (value: string) => {
        if (value || value !== '') {
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
        if(response.status !== 200) {
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
        <div className="server-inputs">
            <form>
                <div className="grid w-full">
                    <div className="flex flex-col space-y-2">
                        <div className="flex items-end">
                            <div className="flex-1">
                                <Label htmlFor="hostInput">1. Enter gRPC endpoint</Label>
                                <Input className={reflections.length > 0 ? "rounded-tr-none rounded-br-none" : ""} id="hostInput" value={host ? host : ''} onChange={handleHostChange} type="text" placeholder="Please enter gRPC endpoint" />
                            </div>
                            {reflections.length > 0 && (
                                <div className="flex-1 relative">
                                    <Label htmlFor="framework">2. Select a Method</Label>
                                    <Select onValueChange={handleMethodChange} value={method}>
                                        <SelectTrigger id="framework" className={reflections.length > 0 && method ? "text-left rounded-none" : "rounded-tl-none rounded-bl-none"}>
                                            <SelectValue placeholder="Select Method" />
                                        </SelectTrigger>
                                        <SelectContent position="popper">
                                            {
                                                reflections.map((service: any, serviceIndex: number) => (
                                                    <SelectGroup key={`${service.title}-${service.serviceName}-service-${serviceIndex}`}>
                                                        <SelectLabel>{service.serviceName}</SelectLabel>
                                                        {
                                                            service.methods.map((method: any, functionIndex: number) => (
                                                                <SelectItem key={`${service.title}-${service.serviceName}-service-${serviceIndex}-${method.fullName}-${functionIndex}`} value={method.fullName}>
                                                                    <div>{method.name}</div>
                                                                    <small className="text-gray-500">{method.fullName}</small>
                                                                </SelectItem>
                                                            ))
                                                        }
                                                        <hr />
                                                    </SelectGroup>
                                                ))
                                            }
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            <div className="flex gap-2">
                                {reflections.length > 0 && method && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        disabled={!method || loading}
                                        onClick={() => sendGrpcRequest({
                                            cacheResponse: true,
                                            successMessage: "Request sent successfully",
                                            saveGrpcResponse: saveGrpcResponse
                                        })}
                                        className="rounded-tl-none rounded-bl-none"
                                    >
                                        <Send className="h-4 w-4" />
                                        {loading ? 'Sending...' : 'Send'}
                                    </Button>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            {host && reflections.length > 0 && (
                                <div className="flex justify-end flex-1">
                                    <Button variant="link" className="h-auto p-0 text-sm" onClick={(event) => fetchGrpcReflections(event, true)} type="button" disabled={loading}>
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                        {loading ? 'Loading...' : 'Fetch/Refetch the methods'}
                                    </Button>
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
