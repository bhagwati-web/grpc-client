import { Label } from "@/components/ui/label"
import { CodePreviewer } from "./code-previewer";

export function ResponseViewer({ grpcResponse }: { grpcResponse: any }) {

    return (
        <>
            <Label>5. gRPC Response</Label>
            <CodePreviewer height="700px" response={grpcResponse} readOnly={true} />
        </>
    )
}