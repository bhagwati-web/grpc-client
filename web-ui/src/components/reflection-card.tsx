import * as React from "react"
import { Button } from "@/components/ui/button"
import { Save, Send } from "lucide-react"

import {
    Card,
    CardContent,
} from "@/components/ui/card"

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"


import { appConfig } from "@/config/config"
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext"
import { AddHeaders } from "@/components/add-headers";
import { AddMessage } from "@/components/add-message";
import { GrpcServerInput } from "@/components/grpc-server-input";
import { AppLoader } from "@/components/app-loader";
import { ResponseViewer } from "@/components/response-viewer";
import { toast } from "@/hooks/use-toast"
import { getGrpcResponse, saveGrpcResponse, scrollToElement } from "@/utils/app-utils"
import { AppAlertDialog } from "@/components/app-alert-dialog"
import { RequestBuilder } from "@/components/request-builder"

export function ReflectionCardWithForm() {
    const [showRequestBuilder, setShowRequestBuilder] = React.useState(false);
    const [grpcResponse, setGrpcResponse] = React.useState(null);
    const grpcResponseRef = React.useRef(null);
    const {
        loading,
        setLoading,
        reload,
        setReload,
        serverInfo
    } = React.useContext(GrpcContext) as GrpcContextProps;

    const { host, method, message, metaData } = serverInfo;
    const isReady = (host && host !== '' && method && method !== '');

    React.useEffect(() => {
        if (reload)
            window.location.reload()

        if (setReload) {
            setReload(false)
        }
    }, [reload])

    React.useEffect(() => {
        const sessionStorageResponses = sessionStorage.getItem('responses');
        if (sessionStorageResponses) {
            setGrpcResponse(getGrpcResponse(host, method))
        }
    }, [host, method])



    const getGrpcRespone = async () => {
        setLoading(true);
        const serviceUrl = `${appConfig.serviceBaseUrl + appConfig.grpcBaseEndpoint + appConfig.grpcCallEndpoint}`
        
        // Debug: Log the metaData to see what format it's in
        console.log('metaData type:', typeof metaData);
        console.log('metaData value:', metaData);
        console.log('metaData is array:', Array.isArray(metaData));
        
        // Ensure metaData is always an object, not an array
        let finalMetaData = metaData;
        if (Array.isArray(metaData)) {
            // Convert array back to object if needed
            finalMetaData = {};
            metaData.forEach(item => {
                if (typeof item === 'object' && item !== null) {
                    Object.assign(finalMetaData, item);
                }
            });
        } else if (!metaData || typeof metaData !== 'object') {
            finalMetaData = {};
        }
        
        // Ensure all metadata values are strings
        const stringifiedMetaData: Record<string, string> = {};
        if (finalMetaData && typeof finalMetaData === 'object') {
            Object.entries(finalMetaData).forEach(([key, value]) => {
                // Convert all values to strings
                stringifiedMetaData[key] = typeof value === 'string' ? value : String(value);
            });
        }
        
        // Send metadata as flat object instead of array
        const payload = { message, host, method, metaData: stringifiedMetaData }
        
        // Debug: Log the full payload
        console.log('Sending payload:', JSON.stringify(payload, null, 2));
        
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        const data = await response.json()
        processGrpcResponse(data)
        console.log(data)
        setLoading(false);
        scrollToElement(grpcResponseRef);
        if (data.error) {
            toast({ title: "Error!", description: `${data.error}`, variant: "destructive" })
        }
    }

    const processGrpcResponse = async (response: any) => {
        // prepare an object containing the response host and method and then save it to the session storage
        saveGrpcResponse(host, method, response);
        setGrpcResponse(response);
        toast({ title: "Finished!", description: `Response also cached, so that you can reuse it later` })
    }

    const saveGrpcRequest = async () => {
        setLoading(true);
        const serviceUrl = `${appConfig.serviceBaseUrl + appConfig.collectionBaseUrl + appConfig.collectionSaveUrl}`

        // Ensure metaData is always an object, not an array
        let finalMetaData = metaData;
        if (Array.isArray(metaData)) {
            finalMetaData = {};
            metaData.forEach(item => {
                if (typeof item === 'object' && item !== null) {
                    Object.assign(finalMetaData, item);
                }
            });
        } else if (!metaData || typeof metaData !== 'object') {
            finalMetaData = {};
        }

        // Ensure all metadata values are strings
        const stringifiedMetaData: Record<string, string> = {};
        if (finalMetaData && typeof finalMetaData === 'object') {
            Object.entries(finalMetaData).forEach(([key, value]) => {
                // Convert all values to strings
                stringifiedMetaData[key] = typeof value === 'string' ? value : String(value);
            });
        }

        const payload = { message, host, service: method?.split('.').slice(0, -1).join('.'), method, metaData: stringifiedMetaData }
        const response = await fetch(serviceUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        const data = await response.json()
        if (data.status === 'success') {
            toast({ title: "Success!", description: data.message })
        }
        else {
            toast({ title: "Error!", description: data.message, variant: "destructive" })
        }
        setLoading(false);
        if (setReload) {
            setReload(true)
        }
    }

    const deleteGrpcRequest = async () => {
        setLoading(true);
        const serviceUrl = `${appConfig.serviceBaseUrl + appConfig.collectionBaseUrl + appConfig.collectionDeleteUrl}`
        
        // Ensure metaData is always an object, not an array
        let finalMetaData = metaData;
        if (Array.isArray(metaData)) {
            finalMetaData = {};
            metaData.forEach(item => {
                if (typeof item === 'object' && item !== null) {
                    Object.assign(finalMetaData, item);
                }
            });
        } else if (!metaData || typeof metaData !== 'object') {
            finalMetaData = {};
        }
        
        const payload = { collectionName: host?.split('.')[0], method: method }
        const response = await fetch(serviceUrl, {
            method: 'DELETE',
            headers: { 
                'Content-Type': 'application/json',
                ...(typeof finalMetaData === 'object' && !Array.isArray(finalMetaData) ? finalMetaData : {})
            },
            body: JSON.stringify(payload)
        })
        const data = await response.json()
        if (data.status === 'error') {
            toast({ title: "Error!", description: `${data.message}`, variant: "destructive" })
            setLoading(false);
            return
        }
        toast({ title: "Success!", description: `${data.message}.` })
        setLoading(false);
        if (setReload) {
            setReload(true)
        }
    }

    return (
        <>
            <div className="flex flex-1 flex-col">
                <div className="rounded-xl bg-zinc-100/50 md:min-h-min dark:bg-zinc-800/50" >
                    <Card className="rounded-none">
                        <CardContent>
                            <div className="flex gap-4 mt-5 mb-5">
                                <div className="w-1/2">
                                    <GrpcServerInput />
                                    {isReady && <div className="flex gap-4 mt-5  justify-between">
                                        <div className="flex gap-4">
                                            <Button disabled={!isReady} onClick={getGrpcRespone}>
                                                <Send />
                                                {loading ? 'Please wait...' : 'Send request'}</Button>
                                            <Button disabled={!isReady} onClick={saveGrpcRequest} variant={"outline"}>
                                                <Save />
                                                {loading ? 'Please wait...' : 'Save request'}</Button>
                                        </div>

                                        <div className="flex gap-4">
                                            <AppAlertDialog disabled={!isReady} onContinue={deleteGrpcRequest} />
                                        </div>
                                    </div>}

                                </div>
                                <div className="w-1/2">
                                    {isReady && <Card>
                                        <CardContent>
                                            <Accordion type="multiple" defaultValue={['item-1', 'item-2']}>
                                                <AccordionItem value="item-1">
                                                    <AccordionTrigger>2. Add Headers/metadata</AccordionTrigger>
                                                    <AccordionContent>
                                                        <AddHeaders />
                                                    </AccordionContent>
                                                </AccordionItem>
                                                <AccordionItem value="item-2">
                                                    <AccordionTrigger>3. Add Message</AccordionTrigger>
                                                    <AccordionContent>
                                                        <AddMessage
                                                            setShowRequestBuilder={setShowRequestBuilder}
                                                            showRequestBuilder={showRequestBuilder}
                                                            isReady={isReady} />
                                                    </AccordionContent>
                                                </AccordionItem>
                                            </Accordion>
                                        </CardContent>
                                    </Card>}

                                </div>
                            </div>
                            {isReady && <div className="flex w-full">
                                {showRequestBuilder && <RequestBuilder setShowRequestBuilder={setShowRequestBuilder} />}
                            </div>}
                        </CardContent>
                    </Card>
                </div>
                <div ref={grpcResponseRef} className="flex w-full">
                    {grpcResponse && <div className="flex-1 rounded-xl bg-zinc-100/50 md:min-h-min dark:bg-zinc-800/50" >
                        <ResponseViewer grpcResponse={grpcResponse} />
                    </div>}
                    {!grpcResponse && <div className="flex-1 p-5 mt-5 " >
                        <div className="flex flex-col items-center justify-center h-full p-5 rounded-xl bg-zinc-100/50 md:min-h-min dark:bg-zinc-800/50">
                            <div className="text-2xl font-bold text-gray-500">No response yet</div>
                            <div className="text-sm text-gray-500">Send a request to see the response</div>
                        </div>
                    </div>}
                </div>
            </div>
            {loading && <AppLoader />}
        </>
    )
}
