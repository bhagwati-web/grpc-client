import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { CodePreviewer } from "./code-previewer";

export function ResponseViewer({ grpcResponse }: { grpcResponse: any }) {

    return (
        <Card className="rounded-none">
            <CardHeader>
                <CardTitle>GRPC Response</CardTitle>
                <CardDescription>Complete response of the request you made</CardDescription>
            </CardHeader>
            <CardContent >
                <CodePreviewer height="500px" response={grpcResponse} readOnly={true} />
            </CardContent>
        </Card>
    )
}