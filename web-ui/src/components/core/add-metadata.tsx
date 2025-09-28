import React from "react";
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext";
import { KeyValueInput } from "./key-value-input";
import { CodePreviewer } from "./code-previewer";
import { prettifyJSON } from "@/utils/app-utils";

import { Button } from "@/components/ui/button";
import { Code2, Edit3 } from "lucide-react";

export function AddMetadata() {
    const {
        serverInfo,
        setServerInfo,
        isReady
    } = React.useContext(GrpcContext) as GrpcContextProps;
    
    const { metaData } = serverInfo;
    const [showCodeEditor, setShowCodeEditor] = React.useState(false);
    const [modeKey, setModeKey] = React.useState(0); // Key to force re-render when switching modes
    
    if (!isReady) {
        return null;
    }

    const handleMetadataChange = (newMetaData: Record<string, string>) => {
        setServerInfo({ ...serverInfo, metaData: newMetaData });
    };

    const handleCodeEditorChange = (value: string) => {
        try {
            const parsedData = JSON.parse(prettifyJSON(value));
            setServerInfo({ ...serverInfo, metaData: parsedData });
        } catch (error) {
            // Handle JSON parsing errors gracefully
            console.warn("Invalid JSON in metadata editor:", error);
        }
    };

    const toggleEditor = () => {
        setShowCodeEditor(!showCodeEditor);
        setModeKey(prev => prev + 1); // Increment key to force re-render when switching modes
    };

    return (
        <div className="add-metadata">
            <div className="flex items-center justify-end mb-3">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleEditor}
                    className="flex items-center gap-2"
                    title={showCodeEditor ? "Switch to form editor" : "Switch to JSON editor"}
                >
                    {showCodeEditor ? (
                        <>
                            <Edit3 className="h-4 w-4" />
                            Form Editor
                        </>
                    ) : (
                        <>
                            <Code2 className="h-4 w-4" />
                            JSON Editor
                        </>
                    )}
                </Button>
            </div>
            
            {showCodeEditor ? (
                <CodePreviewer 
                    height={Object.keys(metaData || {}).length ? "150px" : "auto"} 
                    response={metaData} 
                    readOnly={false} 
                    onDataChange={handleCodeEditorChange}
                />
            ) : (
                <KeyValueInput
                    key={modeKey} // Only re-render when switching modes, not on data changes
                    label=""
                    initialData={metaData || {}}
                    onDataChange={handleMetadataChange}
                    placeholder={{
                        key: "Header name (e.g., authorization)",
                        value: "Header value"
                    }}
                />
            )}
        </div>
    );
}



