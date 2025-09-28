import React from "react";

import { Button } from "@/components/ui/button"
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext";
import { prettifyJSON, generateSampleFromFields } from "@/utils/app-utils";
import { CodePreviewer } from "./code-previewer";
import { Wrench, Sparkles } from "lucide-react";
import { appConfig } from "@/config/config";
import { toast } from "@/hooks/use-toast";

export function AddMessage() {
    const {
        serverInfo,
        setServerInfo,
        isReady,
        showRequestBuilder,
        setShowRequestBuilder,
        methodMetadata,
        setMethodMetadata,
        loading,
        setLoading
    } = React.useContext(GrpcContext) as GrpcContextProps;
    
    const { message, host, method } = serverInfo;
    
    if (!isReady) {
        return null;
    }

    const toggleRequestBuilder = () => {
        if (setShowRequestBuilder) {
            setShowRequestBuilder(!showRequestBuilder);
        }
    };

    const fetchMethodMetadata = async () => {
        if (!host || !method) {
            return null;
        }

        try {
            const serviceName = method?.split('.').slice(0, -1).join('.') || '';
            const methodName = method?.split('.').pop() || '';

            const serviceUrl = `${appConfig.serviceBaseUrl}${appConfig.grpcMetaData}/${host}/${serviceName}/${methodName}`;
            const response = await fetch(serviceUrl);
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            return data.inputDetails;
        } catch (error) {
            throw error;
        }
    }

    const generateSampleRequest = async () => {
        if (!host || !method) {
            toast({ title: "Error!", description: "Host and method are required", variant: "destructive" })
            return;
        }

        if (setLoading) {
            setLoading(true);
        }

        try {
            // Check if we already have cached metadata
            let inputDetails = methodMetadata;

            // If no cached metadata, fetch it
            if (!inputDetails) {
                inputDetails = await fetchMethodMetadata();

                // Cache the metadata for future use
                if (setMethodMetadata && inputDetails) {
                    setMethodMetadata(inputDetails);
                }
            }

            if (!inputDetails) {
                toast({ title: "Error!", description: "Failed to fetch method metadata", variant: "destructive" })
                if (setLoading) {
                    setLoading(false);
                }
                return;
            }

            // Generate sample message from the metadata
            let sampleMessage = {};

            if (inputDetails.sampleRequest) {
                sampleMessage = inputDetails.sampleRequest;
                toast({ title: "Success!", description: "Sample request generated from predefined template!" })
            } else if (inputDetails.fields) {
                // Generate basic sample from field definitions
                sampleMessage = generateSampleFromFields(inputDetails.fields);
                toast({ title: "Success!", description: "Sample request generated from field definitions!" })
            } else {
                toast({ title: "Info", description: "No sample request available for this method" })
                if (setLoading) {
                    setLoading(false);
                }
                return;
            }

            if (Object.keys(sampleMessage).length > 0) {
                setServerInfo({
                    ...serverInfo,
                    message: sampleMessage
                });
            }
        } catch (error) {
            console.error('Sample generation error:', error);
            toast({ title: "Error!", description: "Failed to generate sample request", variant: "destructive" })
        }
        if (setLoading) {
            setLoading(false);
        }
    };

    return (
        <div className="flex mt-4">
            <div className="flex-col w-full">
                <div className="flex items-center justify-end mb-3">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={generateSampleRequest}
                            disabled={loading}
                            className="flex items-center gap-2"
                            title="Generate Sample Request"
                        >
                            <Sparkles className="h-4 w-4" />
                            {loading ? 'Generating...' : 'Generate'}
                        </Button>
                        <Button
                            variant={showRequestBuilder ? "default" : "outline"}
                            size="sm"
                            onClick={toggleRequestBuilder}
                            className="flex items-center gap-2"
                            title="Toggle Request Builder GUI"
                        >
                            <Wrench className="h-4 w-4" />
                            Build Request
                        </Button>
                    </div>
                </div>
                <CodePreviewer height={isReady ? "400px" : "100px"} response={message} readOnly={false} onDataChange={(value) => setServerInfo({ ...serverInfo, message: JSON.parse(prettifyJSON(value)) })} />
            </div>
        </div>
    )
}



