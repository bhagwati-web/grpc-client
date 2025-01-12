import React from "react";
import CodeMirror from '@uiw/react-codemirror';
import { json } from "@codemirror/lang-json";
import { useWidth } from "@/hooks/use-width";


export function CodePreviewer({ response, readOnly, onDataChange, height }: { response: any, readOnly: boolean, onDataChange?: (value: any) => void, height?: string }) {
    const responseWrapper = React.useRef<HTMLDivElement>(null);

    return (
        <div className="grid w-full gap-2 rounded-xl border border-gray-300 overflow-hidden" ref={responseWrapper}>
            <CodeMirror
                value={JSON.stringify(response || {}, null, 2)} // Initial value
                extensions={[json()]} // JSON syntax highlighting
                theme="dark" // Theme: 'dark', 'light', or custom
                readOnly={readOnly} // Make it read-only
                height={height} // Set the editor height
                width={`${useWidth(responseWrapper)}px`}// Set the editor width                                
                basicSetup={{
                    lineNumbers: true, // Show line numbers
                    foldGutter: true, // Enable folding
                }}
                onChange={(value) => onDataChange && onDataChange(value)} // Set the value to the state
            />
        </div>
    )
}