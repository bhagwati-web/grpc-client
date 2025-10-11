import { useContext, useRef, useEffect } from "react"
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext"
import { ModernRestInput } from "@/components/core/modern-rest-input"
import { ModernRestResponse } from "@/components/core/modern-rest-response"
import { AppLoader } from "@/components/shared/app-loader"
import { getRandomLoadingMessage, scrollToElement } from "@/utils/app-utils"

export function RestReflectionCard() {
    const grpcResponseRef = useRef<HTMLDivElement>(null);
    const {
        loading,
        grpcResponse
    } = useContext(GrpcContext) as GrpcContextProps;

    const loadingMessage = getRandomLoadingMessage();

    useEffect(() => {
        // Scroll to the response viewer when grpcResponse changes
        if (grpcResponse) {
            scrollToElement(grpcResponseRef);
        }
    }, [grpcResponse]);

    return (
        <div className="space-y-6">
            {/* Modern REST Request Builder */}
            <ModernRestInput />

            {/* Loading State */}
            {loading && (
                <div className="bg-background border rounded-lg shadow-sm p-6">
                    <AppLoader message={loadingMessage} />
                </div>
            )}

            {/* Response Section */}
            {grpcResponse && !loading && (
                <div ref={grpcResponseRef}>
                    <ModernRestResponse response={grpcResponse} />
                </div>
            )}
        </div>
    )
}