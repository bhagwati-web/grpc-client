import React, { useEffect, useState } from "react";
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext";
import { Button } from "@/components/ui/button"
import { DynamicField } from "@/components/dynamic-components";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { appConfig } from "@/config/config";
import { Layers2, Wrench, X } from "lucide-react";
import { getMethodInputType, getServiceNameFromMethod } from "@/utils/app-utils";
import { toast } from "@/hooks/use-toast";

export function RequestBuilder({ setShowRequestBuilder }: { setShowRequestBuilder: (value: boolean) => void }) {
    const {
        serverInfo,
        loading,
        setLoading,
        setServerInfo
    } = React.useContext(GrpcContext) as GrpcContextProps;
    const { message } = serverInfo;
    const [formData, setFormData] = useState(message);
    const [serviceResponse, setServiceResponse] = useState({ fields: [], message: '' });
    const builderRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (builderRef.current) {
            builderRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [serviceResponse]);


    const handleChange = (fieldName: any, value: any) => {
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

            return newData;
        });
    };

    const handleSubmit = (e: any) => {
        e.preventDefault();
        console.log(JSON.stringify(formData, null, 2));
        setServerInfo({ ...serverInfo, message: formData });
    };

    const fetchMetaData = async () => {
        if (serverInfo.host && serverInfo.method) {
            setLoading(true);
            let functionInput =  getMethodInputType(serverInfo.host, serverInfo.method);
            let servicenName = getServiceNameFromMethod(serverInfo.method, 'full');
            const functionMetaData = await fetch(`${appConfig.serviceBaseUrl}${appConfig.grpcMetaData}/${serverInfo.host}/${servicenName}/${functionInput}`)
            const data = await functionMetaData.json()
            if (data.error) {
                console.error(data.error);
                toast({ title: "Error!", description: data?.error, variant: "destructive"  })
                setLoading(false);
                return;
            }
            console.log("ServiceResponse", data.fields);
            setServiceResponse({
                fields: data.fields,
                message: data.message
            });
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchMetaData();
    }, [serverInfo.method, serverInfo.host]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Loading...</CardTitle>
                </CardHeader>
            </Card>
        )
    }

    if (!serviceResponse?.fields?.length) {
        return null;
    }

    return (
        <Card className="flex-1" ref={builderRef}>
            <CardHeader>
                <CardTitle>
                    <div className="flex items-center gap-2">
                        <Wrench />
                        Build Request
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <form onSubmit={handleSubmit}>
                    {serviceResponse.fields?.map((field: any, index: any) => (
                        <DynamicField
                            isRootElement={true}
                            key={index}
                            field={field}
                            onChange={handleChange}
                        />
                    ))}
                    <div className="mt-4 space-x-2">
                        <Button type="submit"><Layers2 />Update Message</Button>
                        <Button onClick={(e) => {
                            e.preventDefault();
                            setShowRequestBuilder(false)
                        }} className="" variant={"outline"}><X /> Close Builder</Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}

