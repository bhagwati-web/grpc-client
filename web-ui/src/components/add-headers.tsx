import React from "react";
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext";
import { CodePreviewer } from "./code-previewer";
import { prettifyJSON } from "@/utils/app-utils";

export function AddHeaders() {
    const {
        serverInfo,
        setServerInfo
    } = React.useContext(GrpcContext) as GrpcContextProps;
    const { metaData } = serverInfo;
    return (
        <CodePreviewer response={metaData} readOnly={false} onDataChange={(value) => setServerInfo({ ...serverInfo, metaData: JSON.parse(prettifyJSON(value)) })} />
    )
}



