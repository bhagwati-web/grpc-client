import { useState, useEffect, useContext } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { appConfig } from "@/config/config";
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext";

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

// Types for the new collection system
interface Environment {
  id: string;
  name: string;
  description?: string;
  variables: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Collection {
  id: string;
  name: string;
  description?: string;
  requests: any[];
  environments: Environment[];
  variables?: Record<string, string>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface SaveRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  serverInfo: {
    host: string;
    method: string;
    message: any;
    metaData: Record<string, string>;
  };
  collections: Collection[];
  onSaved: () => void;
  initialCollectionId?: string;
  prefillFromCurrent?: boolean; // If true, prefill with current request data. If false, start fresh
}

export function SaveRequestDialog({
  isOpen,
  onClose,
  serverInfo,
  collections,
  onSaved,
  initialCollectionId,
  prefillFromCurrent = false, // Default to fresh dialog
}: SaveRequestDialogProps) {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [selectedEnvironmentId, setSelectedEnvironmentId] = useState<string>("");
  const [requestName, setRequestName] = useState<string>("");
  const [requestDescription, setRequestDescription] = useState<string>("");
  const [isCreatingNewCollection, setIsCreatingNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState<string>("");
  const [newCollectionDescription, setNewCollectionDescription] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [hostInput, setHostInput] = useState<string>(serverInfo?.host || "");
  const [methodInput, setMethodInput] = useState<string>(serverInfo?.method || "");

  const { setServerInfo } = useContext(GrpcContext) as GrpcContextProps;

  // Reset all form fields to initial state
  const resetForm = () => {
    setSelectedCollectionId("");
    setSelectedEnvironmentId("");
    setRequestName("");
    setRequestDescription("");
    setIsCreatingNewCollection(false);
    setNewCollectionName("");
    setNewCollectionDescription("");
    setSaving(false);
    setHostInput("");
    setMethodInput("");
  };

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Initialize selections from props when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (initialCollectionId) setSelectedCollectionId(initialCollectionId);
      
      if (prefillFromCurrent) {
        // Prefill with current request data (for "Save As New")
        setHostInput(serverInfo?.host || "");
        setMethodInput(serverInfo?.method || "");
        // Set request name from current method
        if (serverInfo?.method) {
          const methodName = serverInfo.method.split('.').pop() || serverInfo.method;
          setRequestName(methodName);
        }
      } else {
        // Start fresh (for new request from sidebar)
        setHostInput("");
        setMethodInput("");
        setRequestName("");
        setRequestDescription("");
      }
    }
  }, [isOpen, initialCollectionId, serverInfo, prefillFromCurrent]);

  // Set default collection name from service when creating new collection (only when prefilling)
  useEffect(() => {
    if (isCreatingNewCollection && prefillFromCurrent && serverInfo?.method && !newCollectionName.trim()) {
      try {
        // Extract service name from method (e.g., "grpcb" from "grpcb.Health.Check")
        const methodParts = serverInfo.method.split('.');
        if (methodParts.length >= 2 && methodParts[0]) {
          const serviceName = methodParts[0].trim();
          if (serviceName) {
            setNewCollectionName(serviceName);
          }
        }
      } catch (error) {
        console.error('Error setting default collection name:', error);
      }
    }
  }, [isCreatingNewCollection, prefillFromCurrent, serverInfo?.method, newCollectionName]);

  // Get available environments for selected collection  
  const availableEnvironments = selectedCollectionId
    ? collections.find(c => c.id === selectedCollectionId)?.environments || []
    : [];

  const handleSave = async () => {
    if (!requestName.trim()) {
      toast({
        title: "Error",
        description: "Request name is required",
        variant: "destructive",
      });
      return;
    }

    // Require host and method when saving a request from the sidebar if not present
    if (!hostInput.trim() || !methodInput.trim()) {
      toast({
        title: "Error",
        description: "Host and Method are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      let targetCollectionId = selectedCollectionId;

      // Create new collection if needed
      if (isCreatingNewCollection) {
        if (!newCollectionName.trim()) {
          toast({
            title: "Error", 
            description: "Collection name is required",
            variant: "destructive",
          });
          setSaving(false);
          return;
        }

        const createCollectionResponse = await fetch(`${appConfig.serviceBaseUrl}/collection/collections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newCollectionName,
            description: newCollectionDescription,
          }),
        });

        const createCollectionResult = await createCollectionResponse.json();
        if (createCollectionResult.status !== 'success') {
          throw new Error(createCollectionResult.error || 'Failed to create collection');
        }

        targetCollectionId = createCollectionResult.data.id;
      }

      if (!targetCollectionId) {
        toast({
          title: "Error",
          description: "Please select or create a collection",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Check if trying to save to a read-only collection
      const selectedCollection = collections.find(c => c.id === targetCollectionId);
      if (selectedCollection && isReadOnlyCollection(selectedCollection)) {
        toast({
          title: "Error",
          description: "Cannot save to read-only collection. Please select a different collection or create a new one.",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Create the request object
      // Construct metadata array from provided serverInfo.metaData
      const metadataArray = Object.entries(serverInfo?.metaData || {}).map(([key, value]) => ({
        key,
        value,
        enabled: true,
      }));

      const serviceName = methodInput.includes('.') ? methodInput.split('.').slice(0, -1).join('.') : (serverInfo?.method?.split('.').slice(0, -1).join('.') || '');

      const request = {
        name: requestName,
        description: requestDescription,
        type: "grpc",
        host: hostInput,
        grpcConfig: {
          service: serviceName,
          method: methodInput,
          message: serverInfo?.message,
          metadata: metadataArray,
        },
        auth: {
          type: "none",
          config: {},
        },
        variables: {},
        tags: [],
      };

      // Save the request
      const saveResponse = await fetch(`${appConfig.serviceBaseUrl}/collection/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: targetCollectionId,
          request,
        }),
      });

      const saveResult = await saveResponse.json();
      if (saveResult.status !== 'success') {
        throw new Error(saveResult.error || 'Failed to save request');
      }

      toast({
        title: "Success",
        description: "Request saved successfully",
      });

      // Update global server info so clicking the saved request opens the reflection/form
      try {
        // retrieve id from response if available
        const savedRequestId = saveResult?.data?.request?.id || saveResult?.data?.id || undefined;
        setServerInfo({
          host: hostInput,
          method: methodInput,
          id: savedRequestId,
          metaData: serverInfo?.metaData || {},
          message: serverInfo?.message || {},
        });
      } catch (e) {
        // ignore if context not available
      }

      onSaved();
      handleClose();
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save request",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setSelectedCollectionId("");
    setSelectedEnvironmentId("");
    setRequestName("");
    setRequestDescription("");
    setIsCreatingNewCollection(false);
    setNewCollectionName("");
    setNewCollectionDescription("");
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <AlertDialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Save Request</AlertDialogTitle>
          <AlertDialogDescription>
            Save your gRPC request to a collection for future use
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6 py-4">
          {/* Request Details */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold mb-4">Request Details</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="requestName">Request Name *</Label>
                  <Input
                    id="requestName"
                    value={requestName}
                    onChange={(e) => setRequestName(e.target.value)}
                    placeholder="e.g., Create User, Get Profile"
                  />
                </div>
                <div>
                  <Label htmlFor="hostInput">Host *</Label>
                  <Input
                    id="hostInput"
                    value={hostInput}
                    onChange={(e) => setHostInput(e.target.value)}
                    placeholder="e.g., api.example.com:443"
                  />
                </div>
                <div>
                  <Label htmlFor="methodInput">Method *</Label>
                  <Input
                    id="methodInput"
                    value={methodInput}
                    onChange={(e) => setMethodInput(e.target.value)}
                    placeholder="e.g., mypackage.Service.Method or Method"
                  />
                </div>
                <div>
                  <Label htmlFor="requestDescription">Description</Label>
                  <Textarea
                    id="requestDescription"
                    value={requestDescription}
                    onChange={(e) => setRequestDescription(e.target.value)}
                    placeholder="Optional description for this request"
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Collection & Organization */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold mb-4">Organization</h3>
              <div className="space-y-4">
                {/* Collection Selection */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label>Collection *</Label>
                    {!isCreatingNewCollection ? (
                      <Select
                        value={selectedCollectionId}
                        onValueChange={setSelectedCollectionId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select collection" />
                        </SelectTrigger>
                        <SelectContent>
                          {collections.filter(collection => !isReadOnlyCollection(collection)).map((collection) => (
                            <SelectItem key={collection.id} value={collection.id}>
                              {collection.name}
                            </SelectItem>
                          ))}
                          {collections.filter(collection => isReadOnlyCollection(collection)).map((collection) => (
                            <SelectItem key={collection.id} value={collection.id} disabled>
                              {collection.name} (Read-only)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          value={newCollectionName}
                          onChange={(e) => setNewCollectionName(e.target.value)}
                          placeholder="New collection name"
                        />
                        <Textarea
                          value={newCollectionDescription}
                          onChange={(e) => setNewCollectionDescription(e.target.value)}
                          placeholder="Collection description (optional)"
                          rows={2}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 pt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCreatingNewCollection(!isCreatingNewCollection)}
                    >
                      <Plus className="h-4 w-4" />
                      {isCreatingNewCollection ? "Cancel" : "New"}
                    </Button>
                  </div>
                </div>

                {/* Environment Selection */}
                {selectedCollectionId && availableEnvironments.length > 0 && (
                  <div>
                    <Label>Environment (Optional)</Label>
                    <Select
                      value={selectedEnvironmentId}
                      onValueChange={setSelectedEnvironmentId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Use current values" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Use current values</SelectItem>
                        {availableEnvironments.map((env) => (
                          <SelectItem key={env.id} value={env.id}>
                            {env.name}
                            {env.isActive && " (Active)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Request Preview */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-sm font-semibold mb-4">Request Preview</h3>
              <div className="space-y-2 text-sm">
                <div><strong>Host:</strong> {serverInfo.host}</div>
                <div><strong>Method:</strong> {serverInfo.method}</div>
                <div><strong>Metadata:</strong> {Object.keys(serverInfo.metaData || {}).length} items</div>
                <div><strong>Message:</strong> {serverInfo.message ? 'Configured' : 'Empty'}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Request'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}