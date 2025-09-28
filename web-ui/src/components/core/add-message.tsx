import React from "react";
import { Label } from "@/components/ui/label"
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext";


import { prettifyJSON } from "@/utils/app-utils";
import { CodePreviewer } from "./code-previewer";

export function AddMessage() {
    const {
        serverInfo,
        setServerInfo,
        isReady
    } = React.useContext(GrpcContext) as GrpcContextProps;
    const { message } = serverInfo;
    if (!isReady) {
        return null;
    }
    return (
        <div className="flex mt-4">
            <div className="flex-col w-full">
                <Label htmlFor="hostInput">4. Build Message</Label>
                <CodePreviewer height={isReady ? "400px" : "100px"} response={message} readOnly={false} onDataChange={(value) => setServerInfo({ ...serverInfo, message: JSON.parse(prettifyJSON(value)) })} />
            </div>
        </div>
    )
}



