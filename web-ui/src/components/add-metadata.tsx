import React from "react";
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext";
import { CodePreviewer } from "./code-previewer";
import { prettifyJSON } from "@/utils/app-utils";
import { Label } from "@/components/ui/label"

export function AddMetadata() {
    const {
        serverInfo,
        setServerInfo,
        isReady
    } = React.useContext(GrpcContext) as GrpcContextProps;
    const { metaData } = serverInfo;
    if (!isReady) {
        return null;
    }
    return (
        <div className="add-metadata">
            <Label htmlFor="hostInput">3. Put Metadata</Label>
            <CodePreviewer response={metaData} readOnly={false} onDataChange={(value) => setServerInfo({ ...serverInfo, metaData: JSON.parse(prettifyJSON(value)) })} />
        </div>
    )
}



