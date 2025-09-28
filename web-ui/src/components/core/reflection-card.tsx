import * as React from "react"
import { Card, CardContent, } from "@/components/ui/card"

import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext"
import { GrpcServerInput } from "@/components/core/grpc-server-input";
import { AppLoader } from "@/components/shared/app-loader";
import { ResponseViewer } from "@/components/core/response-viewer";
import { getGrpcResponse, getRandomLoadingMessage } from "@/utils/app-utils"
import { RequestBuilder } from "@/components/core/request-builder"
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

     React.useEffect(() => {
        // Scroll to the bottom of the response viewer when grpcResponse changes
        const element: any = grpcResponseRef.current;
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    }, [grpcResponse]);


    return (
        <>
            <div className="flex flex-col gap-4 mb-5 w-full lg:flex-row">
                <div className="xl:w-1/2 lg:w-full sm:w-full">
                    <Card className="">
                        <CardContent className="space-y-4 p-4" >
                            <GrpcServerInput />
                            <AddMetadata />
                            <AddMessage />
                            <RequestActions />
                        </CardContent>
                    </Card>
                </div>
                <div className="xl:w-1/2 lg:w-full sm:w-full flex flex-col">
                    <div ref={grpcResponseRef}>
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
