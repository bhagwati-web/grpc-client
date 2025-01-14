
import React from "react"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

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
import { getReflections, saveReflections } from "@/utils/app-utils"
import { toast } from "@/hooks/use-toast"

export function GrpcServerInput() {
    const {
        loading,
        setLoading,
        serverInfo,
        setServerInfo
    } = React.useContext(GrpcContext) as GrpcContextProps;

    const [reflections, setReflections] = React.useState([]);
    const { host, method } = serverInfo;

    React.useEffect(() => {
        fetchGrpcReflections({ preventDefault: () => { } }, false)
    }, [serverInfo.method]);

    const handleHostChange = React.useCallback((e: any) => {
        setServerInfo((prev: any) => ({ ...prev, host: e.target.value }))
    }, [host]);

    const handleMethodChange = React.useCallback((value: string) => {
        setServerInfo((prev: any) => ({ ...prev, method: value }))
    }, [method]);

    const fetchGrpcReflections = async (e: any, forceFetch: boolean) => {
        e.preventDefault()
        setLoading(true);
        if (!host || host === '') {
            setLoading(false);
            return;
        }
        const localReflections = getReflections(host);

        if (localReflections && !forceFetch) {
            setReflections(localReflections)
            setLoading(false);
            return;
        }

        const serviceUrl = `${appConfig.serviceBaseUrl + appConfig.grpcMetaData}/${host}`
        const response = await fetch(serviceUrl)
        const data = await response.json()

        if (data.error) {
            toast({ title: "Error!", description: data?.error, variant: "destructive"  })
            setLoading(false);
            return;
        }

        setReflections(data)
        saveReflections(host, data)
        setLoading(false);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>1. Choose your inputs</CardTitle>
                <CardDescription>Please enter grpc endpoint and choose a method to start</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1" >
                <form>
                    <div className="grid w-full items-center gap-4">
                        <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="hostInput">GRPC Endpoint</Label>
                            <div className="flex flex-col">
                                <div className="flex-1 w-full">
                                    <Input id="hostInput" value={host ? host : ''} onChange={handleHostChange} type="text" placeholder="Please enter gRPC endpoint and hit enter" />
                                </div>
                                {host && <div className="flex-1 w-full mt-2">
                                    <Button variant={"link"} onClick={(event) => fetchGrpcReflections(event, true)} type="submit">{loading ? 'Please wait...' : 'Fetch/Refetch the methods'}</Button>
                                </div>}
                            </div>
                        </div>

                        {reflections.length > 0 && <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="framework">Choose Method</Label>
                            <Select onValueChange={handleMethodChange} value={method}>
                                <SelectTrigger id="framework" className="text-left">
                                    <SelectValue placeholder="Select" />
                                </SelectTrigger>
                                <SelectContent position="popper">
                                    {
                                        reflections.map((service: any, serviceIndex: number) => (
                                            <SelectGroup key={`${service.title}-${service.serviceName}-service-${serviceIndex}`}>
                                                <SelectLabel>{service.serviceName}</SelectLabel>
                                                {
                                                    service.functions.map((method: any, functionIndex: number) => (
                                                        <SelectItem key={`${service.title}-${service.serviceName}-service-${serviceIndex}-${method.detailName}-${functionIndex}`} value={method.detailName}>
                                                            <div>{method.functionName}</div>
                                                            <small className="text-gray-500">{method.detailName}</small>
                                                        </SelectItem>
                                                    ))
                                                }
                                                <hr />
                                            </SelectGroup>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>}
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
