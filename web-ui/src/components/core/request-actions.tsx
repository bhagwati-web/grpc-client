import React from "react"
import { Button } from "@/components/ui/button"
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext"
import { appConfig } from "@/config/config"
import { toast } from "@/hooks/use-toast"
import { useGrpcRequest } from "@/hooks/use-grpc-request"
import { getDefaultMethodData } from "@/utils/app-utils"
import { Save, Trash, Send } from "lucide-react"

export function RequestActions() {
    const {
        serverInfo,
        setServerInfo,
        isReady,
        refreshCollection,
        setMethodMetadata
    } = React.useContext(GrpcContext) as GrpcContextProps;

    const { sendGrpcRequest, loading, setLoading } = useGrpcRequest();

    const { host, method, message, metaData } = serverInfo;

    // Clear cached metadata when method changes
    React.useEffect(() => {
        if (setMethodMetadata) {
            setMethodMetadata(null);
        }
    }, [method, host]);

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
        if (refreshCollection) {
            refreshCollection()
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
        
        // Reset to default state after successful delete
        const defaultData = getDefaultMethodData();
        setServerInfo((prev: any) => ({
            ...prev,
            metaData: defaultData.metaData,
            message: defaultData.message
        }));
        
        setLoading(false);
        if (refreshCollection) {
            refreshCollection()
        }
    }

    if (!isReady) {
        return null;
    }

    return (
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
            <div className="mt-2 flex gap-2">
                <Button
                    size="sm"
                    type="button"
                    variant="destructive"
                    disabled={!method || loading}
                    onClick={() => sendGrpcRequest()}
                >
                    <Send className="h-4 w-4" />
                    {loading ? 'Sending...' : 'Send Request'}
                </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={saveGrpcRequest}
                    type="button"
                    disabled={loading}
                    title="Save gRPC Request"
                >
                    <Save className="h-3 w-3" />
                    {loading ? 'Saving...' : 'Save'}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={deleteGrpcRequest}
                    type="button"
                    disabled={loading}
                    title="Delete gRPC Request"
                >
                    <Trash className="h-3 w-3" />
                    {loading ? 'Deleting...' : 'Delete'}
                </Button>
            </div>
        </div>
    )
}
