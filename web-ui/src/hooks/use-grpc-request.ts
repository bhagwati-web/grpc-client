import React from 'react';
import { GrpcContext, GrpcContextProps } from '@/providers/GrpcContext';
import { appConfig } from '@/config/config';
import { toast } from '@/hooks/use-toast';

export const useGrpcRequest = () => {
    const {
        loading,
        setLoading,
        serverInfo,
        setGrpcResponse
    } = React.useContext(GrpcContext) as GrpcContextProps;

    const { host, method, message, metaData } = serverInfo;

    const sendGrpcRequest = async (options?: {
        showSuccessToast?: boolean;
        successMessage?: string;
        cacheResponse?: boolean;
        saveGrpcResponse?: (host: string, method: string, data: any) => void;
    }) => {
        const {
            showSuccessToast = true,
            successMessage = "Request sent successfully!",
            cacheResponse = false,
            saveGrpcResponse
        } = options || {};

        if (!host || !method || !message) {
            toast({ 
                title: "Error!", 
                description: "Host, method, and message are required", 
                variant: "destructive" 
            });
            return null;
        }

        setLoading(true);

        try {
            const serviceUrl = `${appConfig.serviceBaseUrl}${appConfig.grpcBaseEndpoint}${appConfig.grpcCallEndpoint}`;
            
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

            const payload = {
                host,
                method,
                message,
                metaData: stringifiedMetaData
            };

            const response = await fetch(serviceUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            // Save the response for reuse if caching is enabled
            if (cacheResponse && saveGrpcResponse) {
                saveGrpcResponse(host, method, data);
            }

            // Store the response in context
            setGrpcResponse(data);

            if (data.error) {
                throw new Error(data.error);
            }

            if (showSuccessToast) {
                const message = cacheResponse 
                    ? `${successMessage} Response cached for reuse.`
                    : successMessage;
                toast({ 
                    title: "Success!", 
                    description: message 
                });
            }

            return data;

        } catch (error) {
            console.error('Send request error:', error);
            toast({ 
                title: "Error!", 
                description: `Failed to send gRPC request: ${error}`, 
                variant: "destructive" 
            });
            return null;
        } finally {
            setLoading(false);
        }
    };

    return {
        sendGrpcRequest,
        loading,
        setLoading
    };
};
