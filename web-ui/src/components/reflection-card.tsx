import * as React from "react"
import { Card, CardContent, } from "@/components/ui/card"

import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext"
import { GrpcServerInput } from "@/components/grpc-server-input";
import { AppLoader } from "@/components/app-loader";
import { ResponseViewer } from "@/components/response-viewer";
import { getGrpcResponse, getRandomLoadingMessage } from "@/utils/app-utils"
import { RequestBuilder } from "@/components/request-builder"
import { AddMetadata } from "./add-metadata"
import { AddMessage } from "./add-message"
import { RequestActions } from "./request-actions"

export function ReflectionCardWithForm() {
    const grpcResponseRef = React.useRef(null);
    const [loadingMessage, setLoadingMessage] = React.useState(getRandomLoadingMessage());
    const {
        loading,
        setLoading,
        serverInfo,
        grpcResponse,
        setGrpcResponse,
        isReady,
        showRequestBuilder
    } = React.useContext(GrpcContext) as GrpcContextProps;

    const { host, method } = serverInfo;

    // Generate a new loading message each time loading starts
    React.useEffect(() => {
        if (loading) {
            setLoadingMessage(getRandomLoadingMessage());
        }
    }, [loading]);

    React.useEffect(() => {
        const sessionStorageResponses = sessionStorage.getItem('responses');
        if (sessionStorageResponses) {
            setGrpcResponse(getGrpcResponse(host, method))
        }
    }, [host, method])

    return (
        <>
            <div className="flex gap-4 mb-5">
                <div className="w-1/2">
                    <Card className="">
                        <CardContent className="space-y-4 p-4" >
                            <GrpcServerInput />
                            <AddMetadata />
                            <AddMessage />
                            <RequestActions />
                        </CardContent>
                    </Card>
                </div>
                <div className="w-1/2">
                    <div ref={grpcResponseRef} className="grpc-output">
                        {grpcResponse &&
                            <ResponseViewer grpcResponse={grpcResponse} />
                        }
                    </div>
                </div>
            </div>
            {isReady && showRequestBuilder && (
                <div className="flex w-full">
                    <RequestBuilder />
                </div>
            )}
            {loading && (
                <AppLoader 
                    message={loadingMessage}
                    onCancel={() => setLoading(false)}
                />
            )}
        </>
    )
}
