import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { appConfig } from "@/config/config"
import { toast } from "@/hooks/use-toast"
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

interface RestHeader {
    key: string;
    value: string;
    enabled: boolean;
}

interface RestActionsProps {
    method: string;
    url: string;
    headers: RestHeader[];
    body: string;
    timeout?: number;
    loading: boolean;
    onSend: () => void;
    currentRequestId?: string;
    onRequestSaved?: () => void;
    onRequestDeleted?: () => void;
}

interface RestActionsProps {
    method: string;
    url: string;
    headers: RestHeader[];
    body: string;
    timeout?: number;
    loading: boolean;
    onSend: () => void;
    currentRequestId?: string;
    onRequestSaved?: () => void;
    onRequestDeleted?: () => void;
}

// Helper function to check if a collection is read-only (sample collection)
const isReadOnlyCollection = (collection: any): boolean => {
  return collection.id === 'sample' ||
         collection.id === 'demo' ||
         collection.id.startsWith('sample-') ||
         collection.id.startsWith('demo-') ||
         collection.name.toLowerCase() === 'sample' ||
         collection.name.toLowerCase() === 'demo' ||
         collection.name.toLowerCase() === 'sample collection' ||
         collection.name.toLowerCase() === 'demo collection' ||
         (collection.description?.toLowerCase().includes('read-only') ?? false);
};

export function RestActions({
    method,
    url,
    headers,
    body,
    loading,
    onSend,
    currentRequestId,
    onRequestSaved,
    onRequestDeleted
}: RestActionsProps) {
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [saveAsNew, setSaveAsNew] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [collections, setCollections] = useState<any[]>([]);
    const [updateLoading, setUpdateLoading] = useState(false);

    // Check if current request belongs to a read-only collection and get the request
    const { currentRequestCollection, currentRequest } = React.useMemo(() => {
        if (!currentRequestId || !collections.length) return { currentRequestCollection: null, currentRequest: null };
        
        for (const collection of collections) {
            const request = collection.requests?.find((r: any) => r.id === currentRequestId);
            if (request) return { currentRequestCollection: collection, currentRequest: request };
        }
        return { currentRequestCollection: null, currentRequest: null };
    }, [currentRequestId, collections]);

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

    const handleSaveClick = () => {
        setSaveAsNew(false);
        setShowSaveDialog(true);
    };

    const handleUpdateClick = async () => {
        if (!currentRequestId) return;
        
        if (isCurrentRequestReadOnly) {
            toast({
                title: "Read-only Request",
                description: "Cannot update requests in sample collections. Use 'Save As New' to create a copy.",
                variant: "destructive",
            });
            return;
        }
        
        // Debug: Log the current values being used for update
        console.log('Update request called with:', {
            currentRequestId,
            method,
            url,
            headers: headers.length,
            body: body.substring(0, 100) + (body.length > 100 ? '...' : '')
        });
        
        setUpdateLoading(true);
        try {
            // Parse body as JSON if it looks like JSON, otherwise send as string
            let parsedBody = body;
            if (body.trim() && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                try {
                    parsedBody = JSON.parse(body);
                } catch {
                    // If parsing fails, keep as string
                    parsedBody = body;
                }
            }

            // Prepare the update payload
            const updatePayload = {
                name: currentRequest?.name || `${method} ${new URL(url).pathname}`, // Preserve original name or fallback to generated name
                type: "rest",
                host: new URL(url).origin,
                restConfig: {
                    method: method,
                    url: url,
                    headers: headers.filter(h => h.enabled && h.key.trim() !== '').map(h => ({
                        key: h.key,
                        value: h.value,
                        enabled: h.enabled,
                    })),
                    body: parsedBody,
                },
            };

            // Debug: Log the exact payload being sent
            console.log('Update payload being sent:', updatePayload);

            // Update existing request
            const response = await fetch(`${appConfig.serviceBaseUrl}/collection/requests/${currentRequestId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            });

            let result;
            const responseText = await response.text();
            
            try {
                if (!responseText.trim()) {
                    throw new Error(`Server returned empty response (status ${response.status})`);
                }
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Response text:', responseText);
                console.error('Parse error:', parseError);
                throw new Error(`Server returned non-JSON response (status ${response.status}). Check console for details.`);
            }
            
            if (result.status !== 'success') {
                throw new Error(result.error || 'Failed to update request');
            }

            toast({
                title: "Success",
                description: "REST request updated successfully",
            });

            if (onRequestSaved) {
                onRequestSaved();
            }
        } catch (error: any) {
            console.error('Update error:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to update request",
                variant: "destructive",
            });
        } finally {
            setUpdateLoading(false);
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
        if (onRequestSaved) {
            onRequestSaved();
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

    const deleteRestRequest = async () => {
        if (!currentRequestId) {
            toast({ 
                title: "Error", 
                description: "No saved request selected to delete. Save the request first or select an existing request.", 
                variant: "destructive" 
            });
            return;
        }

        setUpdateLoading(true);
        try {
            const response = await fetch(`${appConfig.serviceBaseUrl}/collection/requests/${currentRequestId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();
            
            if (data.status === 'error') {
                toast({ 
                    title: "Error!", 
                    description: `${data.message}`, 
                    variant: "destructive" 
                });
                return;
            }

            toast({ 
                title: "Success!", 
                description: "REST request deleted successfully." 
            });

            if (onRequestDeleted) {
                onRequestDeleted();
            }
        } catch (error: any) {
            console.error('Delete error:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to delete request",
                variant: "destructive",
            });
        } finally {
            setUpdateLoading(false);
        }
    };

    // Create serverInfo format compatible with SaveRequestDialog
    const getRestServerInfo = () => {
        // Parse body as JSON if it looks like JSON, otherwise keep as string
        let parsedBody = body;
        if (body.trim() && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            try {
                parsedBody = JSON.parse(body);
            } catch {
                // If parsing fails, keep as string
                parsedBody = body;
            }
        }

        // Convert headers to metaData format for compatibility
        const metaData = headers
            .filter(h => h.enabled && h.key.trim() !== '')
            .reduce((acc, h) => ({ ...acc, [h.key]: h.value }), {});

        // Safely extract host from URL
        let host = '';
        if (url) {
            try {
                host = new URL(url).origin;
            } catch {
                // If URL is invalid, use empty string
                host = '';
            }
        }

        return {
            id: saveAsNew ? undefined : currentRequestId,
            host: host,
            method: `${method} ${url}`, // Combine method and URL for display
            message: parsedBody || {},
            metaData: metaData,
            // Additional REST-specific data
            type: 'rest',
            restConfig: {
                method: method,
                url: url,
                headers: headers.filter(h => h.enabled && h.key.trim() !== '').map(h => ({
                    key: h.key,
                    value: h.value,
                    enabled: h.enabled,
                })),
                body: parsedBody,
            }
        };
    };

    return (
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
            <div className="mt-2 flex gap-2">
                <Button
                    size="sm"
                    type="button"
                    variant="destructive"
                    disabled={!url || loading}
                    onClick={onSend}
                >
                    <Send className="h-4 w-4" />
                    {loading ? 'Sending...' : 'Send Request'}
                </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-4">
                {currentRequestId ? (
                    // Existing request - show Update and Save As New
                    <>
                        <Button
                            variant={isCurrentRequestReadOnly ? "outline" : "default"}
                            size="sm"
                            onClick={handleUpdateClick}
                            type="button"
                            disabled={updateLoading || isCurrentRequestReadOnly}
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
                            disabled={updateLoading}
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
                        disabled={updateLoading || !url}
                        title="Save REST Request"
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
                    disabled={updateLoading}
                    title="Delete REST Request"
                >
                    <Trash className="h-3 w-3" />
                    Delete
                </Button>
            </div>

            <SaveRequestDialog
                isOpen={showSaveDialog}
                onClose={handleSaveDialogClose}
                serverInfo={getRestServerInfo()}
                collections={collections}
                onSaved={handleRequestSaved}
                prefillFromCurrent={true}
            />

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Request</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this REST request? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setShowDeleteDialog(false);
                                deleteRestRequest();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}