import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext"
import { appConfig } from "@/config/config"
import { toast } from "@/hooks/use-toast"
import { useGrpcRequest } from "@/hooks/use-grpc-request"
import { getDefaultMethodData } from "@/utils/app-utils"
import { SaveRequestDialog } from "@/components/collection/save-request-dialog"
import { Save, Trash, Send } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Helper function to check if a collection is read-only (sample collection)
const isReadOnlyCollection = (collection: any): boolean => {
  // Only collections that are explicitly marked as samples or have specific system IDs
  return collection.id === 'sample' ||
         collection.id === 'demo' ||
         collection.id.startsWith('sample-') ||
         collection.id.startsWith('demo-') ||
         // Only if the name is EXACTLY "Sample" or "Demo" (case insensitive)
         collection.name.toLowerCase() === 'sample' ||
         collection.name.toLowerCase() === 'demo' ||
         collection.name.toLowerCase() === 'sample collection' ||
         collection.name.toLowerCase() === 'demo collection' ||
         // Only if description explicitly says it's read-only
         (collection.description?.toLowerCase().includes('read-only') ?? false);
};

export function RequestActions() {
    const {
        serverInfo,
        setServerInfo,
        isReady,
        refreshCollection,
        setMethodMetadata
    } = React.useContext(GrpcContext) as GrpcContextProps;

    const { sendGrpcRequest, loading, setLoading } = useGrpcRequest();
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saveAsNew, setSaveAsNew] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [collections, setCollections] = useState<any[]>([]);

    const { host, method, metaData } = serverInfo;

    // Check if current request belongs to a read-only collection
    const currentRequestCollection = React.useMemo(() => {
        if (!serverInfo?.id || !collections.length) return null;
        
        for (const collection of collections) {
            const request = collection.requests?.find((r: any) => r.id === serverInfo.id);
            if (request) return collection;
        }
        return null;
    }, [serverInfo?.id, collections]);

    const isCurrentRequestReadOnly = currentRequestCollection ? isReadOnlyCollection(currentRequestCollection) : false;

    // Fetch collections when component mounts
    React.useEffect(() => {
        const fetchCollections = async () => {
            try {
                const response = await fetch(`${appConfig.serviceBaseUrl}/collection/workspace`);
                const data = await response.json();
                if (data.collections) {
                    setCollections(data.collections);
                }
            } catch (error) {
                console.error('Error fetching collections:', error);
            }
        };

        fetchCollections();
    }, []);

    // Clear cached metadata when method changes
    React.useEffect(() => {
        if (setMethodMetadata) {
            setMethodMetadata(null);
        }
    }, [method, host]);

    const handleSaveClick = () => {
        setSaveAsNew(false);
        setShowSaveDialog(true);
    };

    const handleUpdateClick = async () => {
        if (!serverInfo?.id) return;
        
        if (isCurrentRequestReadOnly) {
            toast({
                title: "Read-only Request",
                description: "Cannot update requests in sample collections. Use 'Save As New' to create a copy.",
                variant: "destructive",
            });
            return;
        }
        
        setLoading(true);
        try {
            // Update existing request
            const response = await fetch(`${appConfig.serviceBaseUrl}/collection/requests/${serverInfo.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: method?.split('.').pop() || method, // Use method name only
                    type: "grpc",
                    host: host,
                    grpcConfig: {
                        service: method?.split('.').slice(0, -1).join('.') || '',
                        method: method,
                        message: serverInfo?.message || {},
                        metadata: Object.entries(metaData || {}).map(([key, value]) => ({
                            key,
                            value,
                            enabled: true,
                        })),
                    },
                }),
            });

            let result;
            const responseText = await response.text();
            
            try {
                if (!responseText.trim()) {
                    throw new Error(`Server returned empty response (status ${response.status})`);
                }
                result = JSON.parse(responseText);
            } catch (parseError) {
                // If JSON parsing fails, it might be an HTML error page
                console.error('Response text:', responseText);
                console.error('Parse error:', parseError);
                throw new Error(`Server returned non-JSON response (status ${response.status}). Check console for details.`);
            }
            
            if (result.status !== 'success') {
                throw new Error(result.error || 'Failed to update request');
            }

            toast({
                title: "Success",
                description: "Request updated successfully",
            });

            if (refreshCollection) {
                refreshCollection();
            }
        } catch (error: any) {
            console.error('Update error:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to update request",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAsNewClick = () => {
        setSaveAsNew(true);
        setShowSaveDialog(true);
    };

    const handleSaveDialogClose = () => {
        setShowSaveDialog(false);
        setSaveAsNew(false);
    };

    const handleRequestSaved = () => {
        if (refreshCollection) {
            refreshCollection();
        }
        // Refresh collections list
        const fetchCollections = async () => {
            try {
                const response = await fetch(`${appConfig.serviceBaseUrl}/collection/workspace`);
                const data = await response.json();
                if (data.collections) {
                    setCollections(data.collections);
                }
            } catch (error) {
                console.error('Error fetching collections:', error);
            }
        };
        fetchCollections();
    };

    const deleteGrpcRequest = async () => {
        setLoading(true);
            // If we have a saved request id, call the v2 request delete endpoint
            const requestId = serverInfo?.id;
            let serviceUrl = '';
            if (requestId) {
                serviceUrl = `${appConfig.serviceBaseUrl}/collection/requests/${requestId}`;
            } else {
                // fallback to legacy collection delete behavior (not ideal)
                toast({ title: "Error", description: "No saved request selected to delete. Save the request first or select an existing request.", variant: "destructive" });
                setLoading(false);
                return;
            }

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

        const response = await fetch(serviceUrl, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...(typeof finalMetaData === 'object' && !Array.isArray(finalMetaData) ? finalMetaData : {})
            },
        })
        const data = await response.json()
        if (data.status === 'error') {
            toast({ title: "Error!", description: `${data.message}`, variant: "destructive" })
            setLoading(false);
            return
        }
        toast({ title: "Success!", description: `${data.message}.` })
        
        // Reset to default state after successful delete
        const defaultData = getDefaultMethodData();
        setServerInfo((prev: any) => ({
            ...prev,
            id: undefined, // Clear the request id since it's been deleted
            host: '',
            method: '',
            metaData: defaultData.metaData,
            message: defaultData.message
        }));
        
        setLoading(false);
        if (refreshCollection) {
            refreshCollection()
        }
    }

    if (!isReady) {
        return null;
    }

    return (
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
            <div className="mt-2 flex gap-2">
                <Button
                    size="sm"
                    type="button"
                    variant="destructive"
                    disabled={!method || loading}
                    onClick={() => sendGrpcRequest()}
                >
                    <Send className="h-4 w-4" />
                    {loading ? 'Sending...' : 'Send Request'}
                </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-4">
                {serverInfo?.id ? (
                    // Existing request - show Update and Save As New
                    <>
                        <Button
                            variant={isCurrentRequestReadOnly ? "outline" : "default"}
                            size="sm"
                            onClick={handleUpdateClick}
                            type="button"
                            disabled={loading || isCurrentRequestReadOnly}
                            title={isCurrentRequestReadOnly ? "Cannot update read-only requests" : "Update existing request"}
                            className={isCurrentRequestReadOnly ? "opacity-50 cursor-not-allowed" : ""}
                        >
                            <Save className="h-3 w-3" />
                            {isCurrentRequestReadOnly ? "Read-only" : "Update"}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSaveAsNewClick}
                            type="button"
                            disabled={loading}
                            title="Save as new request"
                        >
                            <Save className="h-3 w-3" />
                            Save As New
                        </Button>
                    </>
                ) : (
                    // New request - show Save
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveClick}
                        type="button"
                        disabled={loading}
                        title="Save gRPC Request"
                    >
                        <Save className="h-3 w-3" />
                        Save
                    </Button>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    type="button"
                    disabled={loading}
                    title="Delete gRPC Request"
                >
                    <Trash className="h-3 w-3" />
                    Delete
                </Button>
            </div>

            <SaveRequestDialog
                isOpen={showSaveDialog}
                onClose={handleSaveDialogClose}
                serverInfo={saveAsNew ? { ...serverInfo, id: undefined } : serverInfo}
                collections={collections}
                onSaved={handleRequestSaved}
                prefillFromCurrent={true} // Always prefill when saving from actions
            />

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Request</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this request? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setShowDeleteDialog(false);
                                deleteGrpcRequest();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
