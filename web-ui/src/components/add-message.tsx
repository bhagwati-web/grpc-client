import React from "react";
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext";
import { Checkbox } from "@/components/ui/checkbox"


import { prettifyJSON } from "@/utils/app-utils";
import { CodePreviewer } from "./code-previewer";

export function AddMessage({ showRequestBuilder, setShowRequestBuilder, isReady }: { showRequestBuilder: boolean, setShowRequestBuilder: (value: boolean) => void, isReady: boolean }) {
    const {
        serverInfo,
        setServerInfo
    } = React.useContext(GrpcContext) as GrpcContextProps;
    const { message} = serverInfo;
    return (
        <div className="flex">
            <div className="flex-col w-full">
                <CodePreviewer height={isReady ? "400px" : "100px"} response={message} readOnly={false} onDataChange={(value) => setServerInfo({ ...serverInfo, message: JSON.parse(prettifyJSON(value)) })} />
                {isReady && <div className="mt-2">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="requestBuilder" checked={showRequestBuilder} onCheckedChange={(value: any) => setShowRequestBuilder(value)} />
                        <label
                            htmlFor="requestBuilder"
                            className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                            Want to use request builder?
                        </label>
                    </div>
                </div>}
            </div>
        </div>
    )
}



