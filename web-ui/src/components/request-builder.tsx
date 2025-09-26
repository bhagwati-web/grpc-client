import React, { useEffect, useState, useCallback } from "react";
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext";
import { Button } from "@/components/ui/button"
import { DynamicField } from "@/components/dynamic-components";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { appConfig } from "@/config/config";
import { Wrench, X } from "lucide-react";
import { getServiceNameFromMethod } from "@/utils/app-utils";
import { toast } from "@/hooks/use-toast";

// Simple debounce utility function with cancel method
const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    const debounced = (...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
    debounced.cancel = () => clearTimeout(timeoutId);
    return debounced;
};

export function RequestBuilder() {
    const {
        serverInfo,
        loading,
        setLoading,
        setServerInfo,
        isReady,
        showRequestBuilder,
        setShowRequestBuilder,
        methodMetadata,
        setMethodMetadata
    } = React.useContext(GrpcContext) as GrpcContextProps;
    const { message } = serverInfo;
    const [formData, setFormData] = useState(message);
    const [serviceResponse, setServiceResponse] = useState({ fields: [], message: '' });
    const builderRef = React.useRef<HTMLDivElement>(null);

    // Sync formData with serverInfo.message when it changes
    React.useEffect(() => {
        setFormData(message || {});
    }, [message]);

    React.useEffect(() => {
        if (builderRef.current) {
            builderRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [serviceResponse]);


    // Similar to handle change, suppose I want remove that key from the formData with the help of a name and field. 
    // I can do that by using the following code:
    const handleRemove = (fieldName: any) => {
        setFormData((prevData: any) => {
            const newData = { ...prevData };
            const keys = fieldName.split('.');
            let current: any = newData;

            keys.forEach((key: any, index: any) => {
                if (key.includes('[')) {
                    const [arrayKey, arrayIndex] = key.split(/[\[\]]/).filter(Boolean);
                    if (!current[arrayKey]) current[arrayKey] = [];
                    if (!current[arrayKey][arrayIndex]) current[arrayKey][arrayIndex] = {};
                    if (index === keys.length - 1) {
                        delete current[arrayKey][arrayIndex];
                    } else {
                        current = current[arrayKey][arrayIndex];
                    }
                } else {
                    if (index === keys.length - 1) {
                        delete current[key];
                    } else {
                        if (!current[key]) current[key] = {};
                        current = current[key];
                    }
                }
            });

            return newData;
        });
    }

    // Debounced function to update global state
    const debouncedUpdateGlobalState = useCallback(
        debounce((newData: any) => {
            setServerInfo({ ...serverInfo, message: newData });
        }, 300),
        [serverInfo, setServerInfo]
    );

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            debouncedUpdateGlobalState.cancel?.();
        };
    }, [debouncedUpdateGlobalState]);

    const handleChange = useCallback((fieldName: any, value: any) => {
        setFormData((prevData: any) => {
            const newData = { ...prevData };
            const keys = fieldName.split('.');
            let current: any = newData;

            keys.forEach((key: any, index: any) => {
                if (key.includes('[')) {
                    const [arrayKey, arrayIndex] = key.split(/[\[\]]/).filter(Boolean);
                    if (!current[arrayKey]) current[arrayKey] = [];
                    if (!current[arrayKey][arrayIndex]) current[arrayKey][arrayIndex] = {};
                    if (index === keys.length - 1) {
                        current[arrayKey][arrayIndex] = value;
                    } else {
                        current = current[arrayKey][arrayIndex];
                    }
                } else {
                    if (index === keys.length - 1) {
                        current[key] = value;
                    } else {
                        if (!current[key]) current[key] = {};
                        current = current[key];
                    }
                }
            });

            // Debounced update to global state to prevent excessive re-renders
            debouncedUpdateGlobalState(newData);
            
            return newData;
        });
    }, [debouncedUpdateGlobalState]);

    const fetchMetaData = useCallback(async () => {
        if (serverInfo.host && serverInfo.method) {
            // Check if we already have cached metadata
            if (methodMetadata) {
                setServiceResponse({
                    fields: methodMetadata.fields || [],
                    message: methodMetadata.message || ''
                });
                return;
            }

            setLoading(true);
            let servicenName = getServiceNameFromMethod(serverInfo.method, 'full');
            let methodName = serverInfo.method.split('.').pop() || '';
            console.log(`Fetching metadata for ${methodName}`);
            console.log(`${appConfig.serviceBaseUrl}${appConfig.grpcMetaData}/${serverInfo.host}/${servicenName}/${methodName}`);
            try {
                const functionMetaData = await fetch(`${appConfig.serviceBaseUrl}${appConfig.grpcMetaData}/${serverInfo.host}/${servicenName}/${methodName}`) || null;
                const data = await functionMetaData.json();

                const { inputDetails } = data;

                if (data && data.error) {
                    console.error(data.error);
                    toast({ title: "Error!", description: data.error, variant: "destructive" })
                    setLoading(false);
                    return;
                }

                // Cache the metadata in the global context
                if (setMethodMetadata && inputDetails) {
                    setMethodMetadata(inputDetails);
                }

                setServiceResponse({
                    fields: inputDetails.fields,
                    message: inputDetails.message
                });
                setLoading(false);
            } catch (error) {
                console.error("Error fetching metadata:", error);
                toast({ title: "Error!", description: "Failed to fetch metadata", variant: "destructive" })
                setLoading(false);
            }
        }
    }, [serverInfo.host, serverInfo.method, methodMetadata, setMethodMetadata, setLoading, toast]);

    useEffect(() => {
        if (showRequestBuilder && isReady) {
            fetchMetaData();
        }
    }, [showRequestBuilder, isReady, fetchMetaData]);

    // First check if the request builder should be shown
    if (!showRequestBuilder) {
        return null;
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Loading...</CardTitle>
                </CardHeader>
            </Card>
        )
    }

    if (!isReady) {
        return null;
    }

    if (!serviceResponse?.fields?.length) {
        return null;
    }

    return (
        <div className="flex flex-col w-full">
            <Card className="flex-1 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700" ref={builderRef}>
                <CardHeader>
                    <CardTitle className="flex justify-between">
                        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                            <Wrench className="h-5 w-5" />
                            Build Request
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={(e) => {
                                e.preventDefault();
                                setShowRequestBuilder(false)
                            }} className="" variant={"outline"}><X /> Close Builder</Button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 bg-gray-50 dark:bg-gray-800/50">
                    {serviceResponse.fields?.map((field: any, index: any) => (
                        <DynamicField
                            isRootElement={true}
                            key={index}
                            field={field}
                            onChange={handleChange}
                            onRemove={handleRemove}
                            formData={formData}
                        />
                    ))}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex items-center gap-2">
                        <Button onClick={(e) => {
                            e.preventDefault();
                            setShowRequestBuilder(false)
                        }} className="" variant={"outline"}><X /> Close Builder</Button>
                    </div>
                </CardFooter>
            </Card>
        </div>
    )
}

