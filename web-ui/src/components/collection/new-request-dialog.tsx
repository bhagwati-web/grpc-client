import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Save, 
  Trash2, 
  Globe, 
  Settings,
  FileText,
  Server
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { appConfig } from "@/config/config";

// Request types
export type RequestType = "rest" | "grpc";
export type RestMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

interface QueryParam {
  key: string;
  value: string;
  enabled: boolean;
}

interface Collection {
  id: string;
  name: string;
  description?: string;
  requests: any[];
  environments: any[];
  variables?: Record<string, string>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface NewRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  onSaved: (requestData: any) => void;
  initialCollectionId?: string;
}

const REST_METHODS: { value: RestMethod; label: string; color: string }[] = [
  { value: "GET", label: "GET", color: "bg-blue-100 dark:bg-blue-950/50 text-blue-800 dark:text-blue-400" },
  { value: "POST", label: "POST", color: "bg-green-100 dark:bg-green-950/50 text-green-800 dark:text-green-400" },
  { value: "PUT", label: "PUT", color: "bg-orange-100 dark:bg-orange-950/50 text-orange-800 dark:text-orange-400" },
  { value: "DELETE", label: "DELETE", color: "bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-400" },
  { value: "PATCH", label: "PATCH", color: "bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-400" },
  { value: "HEAD", label: "HEAD", color: "bg-gray-100 dark:bg-gray-950/50 text-gray-800 dark:text-gray-400" },
  { value: "OPTIONS", label: "OPTIONS", color: "bg-yellow-100 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-400" },
];

const DEFAULT_REST_HEADERS: Header[] = [
  { key: "Content-Type", value: "application/json", enabled: true },
  { key: "Accept", value: "application/json", enabled: true },
];

export function NewRequestDialog({
  isOpen,
  onClose,
  collections,
  onSaved,
  initialCollectionId,
}: NewRequestDialogProps) {
  // Form state
  const [requestType, setRequestType] = useState<RequestType>("rest");
  const [requestName, setRequestName] = useState<string>("");
  const [requestDescription, setRequestDescription] = useState<string>("");
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [isCreatingNewCollection, setIsCreatingNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState<string>("");
  const [newCollectionDescription, setNewCollectionDescription] = useState<string>("");
  
  // REST-specific state
  const [restMethod, setRestMethod] = useState<RestMethod>("GET");
  const [restUrl, setRestUrl] = useState<string>("");
  const [restHeaders, setRestHeaders] = useState<Header[]>(DEFAULT_REST_HEADERS);
  const [restParams, setRestParams] = useState<QueryParam[]>([]);
  const [restBody, setRestBody] = useState<string>("{}");
  const [restBodyType, setRestBodyType] = useState<string>("json");
  
  // gRPC-specific state
  const [grpcHost, setGrpcHost] = useState<string>("");
  const [grpcPort, setGrpcPort] = useState<string>("50051");
  const [grpcService, setGrpcService] = useState<string>("");
  const [grpcMethod, setGrpcMethod] = useState<string>("");
  const [grpcMessage, setGrpcMessage] = useState<string>("{}");
  const [grpcUseTLS, setGrpcUseTLS] = useState<boolean>(false);
  const [grpcMetadata, setGrpcMetadata] = useState<Header[]>([]);
  
  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset form first, then set initial values
      resetForm();
      if (initialCollectionId) {
        setSelectedCollectionId(initialCollectionId);
      }
    }
  }, [isOpen, initialCollectionId]);

  const resetForm = () => {
    setRequestType("rest");
    setRequestName("");
    setRequestDescription("");
    setSelectedCollectionId("");
    setIsCreatingNewCollection(false);
    setNewCollectionName("");
    setNewCollectionDescription("");
    
    // REST fields
    setRestMethod("GET");
    setRestUrl("");
    setRestHeaders(DEFAULT_REST_HEADERS);
    setRestParams([]);
    setRestBody("{}");
    setRestBodyType("json");
    
    // gRPC fields
    setGrpcHost("");
    setGrpcPort("50051");
    setGrpcService("");
    setGrpcMethod("");
    setGrpcMessage("{}");
    setGrpcUseTLS(false);
    setGrpcMetadata([]);
    
    setSaving(false);
  };

  // Header/Metadata management
  const addHeader = (isGrpc = false) => {
    const newHeader = { key: "", value: "", enabled: true };
    if (isGrpc) {
      setGrpcMetadata([...grpcMetadata, newHeader]);
    } else {
      setRestHeaders([...restHeaders, newHeader]);
    }
  };

  const updateHeader = (index: number, field: keyof Header, value: any, isGrpc = false) => {
    if (isGrpc) {
      const updated = [...grpcMetadata];
      updated[index] = { ...updated[index], [field]: value };
      setGrpcMetadata(updated);
    } else {
      const updated = [...restHeaders];
      updated[index] = { ...updated[index], [field]: value };
      setRestHeaders(updated);
    }
  };

  const removeHeader = (index: number, isGrpc = false) => {
    if (isGrpc) {
      setGrpcMetadata(grpcMetadata.filter((_, i) => i !== index));
    } else {
      setRestHeaders(restHeaders.filter((_, i) => i !== index));
    }
  };

  // Query parameters management
  const addParam = () => {
    setRestParams([...restParams, { key: "", value: "", enabled: true }]);
  };

  const updateParam = (index: number, field: keyof QueryParam, value: any) => {
    const updated = [...restParams];
    updated[index] = { ...updated[index], [field]: value };
    setRestParams(updated);
  };

  const removeParam = (index: number) => {
    setRestParams(restParams.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    // Prevent multiple simultaneous saves
    if (saving) {
      console.log('Save already in progress, ignoring');
      return;
    }

    // Debug: Log the current form state before validation
    console.log('HandleSave called with state:', {
      requestName: requestName,
      requestType: requestType,
      restUrl: restUrl,
      restMethod: restMethod,
      selectedCollectionId: selectedCollectionId,
      isCreatingNewCollection: isCreatingNewCollection
    });

    // Validation
    if (!requestName.trim()) {
      console.log('Validation failed: Request name is empty');
      toast({
        title: "Error",
        description: "Request name is required",
        variant: "destructive",
      });
      return;
    }

    if (requestType === "rest" && !restUrl.trim()) {
      toast({
        title: "Error", 
        description: "URL is required for REST requests",
        variant: "destructive",
      });
      return;
    }

    if (requestType === "grpc" && (!grpcHost.trim() || !grpcService.trim() || !grpcMethod.trim())) {
      toast({
        title: "Error",
        description: "Host, Service, and Method are required for gRPC requests",
        variant: "destructive",
      });
      return;
    }

    // Collection validation
    if (!isCreatingNewCollection && !selectedCollectionId) {
      toast({
        title: "Error",
        description: "Please select a collection",
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

        const newCollectionData = {
          name: newCollectionName,
          description: newCollectionDescription,
          requests: [],
          environments: [],
          variables: {},
          tags: [],
        };

        const createResponse = await fetch(`${appConfig.collectionBaseUrl}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCollectionData),
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create collection');
        }

        const result = await createResponse.json();
        targetCollectionId = result.id;
        
        toast({
          title: "Success",
          description: `Collection "${newCollectionName}" created successfully`,
        });
      }

      // Prepare request data based on type
      let requestData;
      if (requestType === "rest") {
        // Additional validation before creating request data
        if (!requestName?.trim()) {
          console.error('Critical error: requestName is empty at data creation time');
          toast({
            title: "Error",
            description: "Request name cannot be empty",
            variant: "destructive",
          });
          setSaving(false);
          return;
        }

        if (!restUrl?.trim()) {
          console.error('Critical error: restUrl is empty at data creation time');
          toast({
            title: "Error", 
            description: "URL cannot be empty",
            variant: "destructive",
          });
          setSaving(false);
          return;
        }

        // Extract host from URL safely
        let host = restUrl;
        try {
          host = new URL(restUrl).origin;
        } catch (error) {
          // If URL is invalid, use as-is for now
          console.warn('Invalid URL format:', restUrl);
        }

        requestData = {
          collectionId: targetCollectionId,
          request: {
            name: requestName.trim(),
            description: requestDescription?.trim() || "",
            type: "rest",
            host: host,
            restConfig: {
              method: restMethod || "GET",
              url: restUrl.trim(),
              headers: restHeaders.filter(h => h.key.trim() !== ""),
              params: restParams.filter(p => p.key.trim() !== ""),
              body: restBody || "{}",
              bodyType: restBodyType || "json",
            },
          },
        };
      } else {
        // Parse gRPC message safely
        let parsedMessage = {};
        try {
          parsedMessage = JSON.parse(grpcMessage || "{}");
        } catch (error) {
          console.warn('Invalid JSON in gRPC message:', grpcMessage);
          parsedMessage = {};
        }

        requestData = {
          collectionId: targetCollectionId,
          request: {
            name: requestName,
            description: requestDescription,
            type: "grpc",
            host: `${grpcHost}:${grpcPort}`,
            grpcConfig: {
              service: grpcService,
              method: grpcMethod,
              message: parsedMessage,
              metadata: grpcMetadata.filter(m => m.key.trim() !== ""),
              useTLS: grpcUseTLS,
            },
          },
        };
      }

      // Final validation of request data structure
      if (!requestData.request.name || !requestData.request.name.trim()) {
        console.error('CRITICAL: Final request data has empty name:', requestData);
        toast({
          title: "Error",
          description: "Invalid request data: name is required",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      if (requestData.request.type === "rest" && (!requestData.request.restConfig || !requestData.request.restConfig.url)) {
        console.error('CRITICAL: Final request data missing restConfig:', requestData);
        toast({
          title: "Error",
          description: "Invalid request data: REST configuration is missing",
          variant: "destructive",
        });
        setSaving(false);
        return;
      }

      // Debug: Log the request data being saved
      console.log('Saving request data:', requestData);

      // Save the request
      const saveResponse = await fetch(`${appConfig.collectionBaseUrl}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        console.error('Save request failed:', errorText);
        throw new Error(`Failed to save request: ${saveResponse.status} - ${errorText}`);
      }

      const savedRequest = await saveResponse.json();
      console.log('Request saved successfully:', savedRequest);

      toast({
        title: "Success",
        description: `${requestType.toUpperCase()} request "${requestName}" saved successfully`,
      });

      // Pass the request data back to parent - extract the saved request from the response
      const savedRequestData = savedRequest?.data || requestData.request;
      onSaved(savedRequestData);
      onClose();

    } catch (error) {
      console.error('Error saving request:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save request",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create New Request
          </AlertDialogTitle>
          <AlertDialogDescription>
            Create a new REST API or gRPC request with comprehensive configuration options.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6">
          {/* Request Type Selection */}
          <div className="space-y-2">
            <Label>Request Type</Label>
            <Tabs value={requestType} onValueChange={(value) => setRequestType(value as RequestType)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="rest" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  REST API
                </TabsTrigger>
                <TabsTrigger value="grpc" className="flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  gRPC
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="request-name">Request Name *</Label>
                  <Input
                    id="request-name"
                    value={requestName}
                    onChange={(e) => setRequestName(e.target.value)}
                    placeholder={`Enter ${requestType} request name`}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="request-description">Description</Label>
                  <Input
                    id="request-description"
                    value={requestDescription}
                    onChange={(e) => setRequestDescription(e.target.value)}
                    placeholder="Optional description"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Collection Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Collection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isCreatingNewCollection}
                  onCheckedChange={(checked) => {
                    console.log('Switch toggled:', checked);
                    setIsCreatingNewCollection(checked);
                  }}
                />
                <Label onClick={() => setIsCreatingNewCollection(!isCreatingNewCollection)} className="cursor-pointer">
                  Create new collection
                </Label>
              </div>

              {isCreatingNewCollection ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-collection-name">Collection Name *</Label>
                    <Input
                      id="new-collection-name"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      placeholder="Enter collection name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-collection-description">Collection Description</Label>
                    <Input
                      id="new-collection-description"
                      value={newCollectionDescription}
                      onChange={(e) => setNewCollectionDescription(e.target.value)}
                      placeholder="Optional description"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="existing-collection">Select Collection *</Label>
                  <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a collection" />
                    </SelectTrigger>
                    <SelectContent>
                      {collections.map((collection) => (
                        <SelectItem key={collection.id} value={collection.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{collection.name}</span>
                            {collection.requests?.length > 0 && (
                              <Badge variant="secondary" className="ml-2">
                                {collection.requests.length}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Configuration */}
          {requestType === "rest" ? (
            <RestRequestConfig
              method={restMethod}
              setMethod={setRestMethod}
              url={restUrl}
              setUrl={setRestUrl}
              headers={restHeaders}
              params={restParams}
              body={restBody}
              setBody={setRestBody}
              bodyType={restBodyType}
              setBodyType={setRestBodyType}
              onAddHeader={() => addHeader(false)}
              onUpdateHeader={updateHeader}
              onRemoveHeader={(index) => removeHeader(index, false)}
              onAddParam={addParam}
              onUpdateParam={updateParam}
              onRemoveParam={removeParam}
            />
          ) : (
            <GrpcRequestConfig
              host={grpcHost}
              setHost={setGrpcHost}
              port={grpcPort}
              setPort={setGrpcPort}
              service={grpcService}
              setService={setGrpcService}
              method={grpcMethod}
              setMethod={setGrpcMethod}
              message={grpcMessage}
              setMessage={setGrpcMessage}
              useTLS={grpcUseTLS}
              setUseTLS={setGrpcUseTLS}
              metadata={grpcMetadata}
              onAddMetadata={() => addHeader(true)}
              onUpdateMetadata={(index, field, value) => updateHeader(index, field, value, true)}
              onRemoveMetadata={(index) => removeHeader(index, true)}
            />
          )}
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Create Request
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// REST Request Configuration Component
interface RestRequestConfigProps {
  method: RestMethod;
  setMethod: (method: RestMethod) => void;
  url: string;
  setUrl: (url: string) => void;
  headers: Header[];
  params: QueryParam[];
  body: string;
  setBody: (body: string) => void;
  bodyType: string;
  setBodyType: (type: string) => void;
  onAddHeader: () => void;
  onUpdateHeader: (index: number, field: keyof Header, value: any, isGrpc?: boolean) => void;
  onRemoveHeader: (index: number) => void;
  onAddParam: () => void;
  onUpdateParam: (index: number, field: keyof QueryParam, value: any) => void;
  onRemoveParam: (index: number) => void;
}

function RestRequestConfig({
  method,
  setMethod,
  url,
  setUrl,
  headers,
  params,
  body,
  setBody,
  bodyType,
  setBodyType,
  onAddHeader,
  onUpdateHeader,
  onRemoveHeader,
  onAddParam,
  onUpdateParam,
  onRemoveParam,
}: RestRequestConfigProps) {

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-4 h-4" />
          REST Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="request" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="request">Request</TabsTrigger>
            <TabsTrigger value="headers">Headers</TabsTrigger>
            <TabsTrigger value="params">Parameters</TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="space-y-4">
            <div className="flex gap-2">
              <Select value={method} onValueChange={(value) => setMethod(value as RestMethod)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REST_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <Badge className={m.color} variant="secondary">
                        {m.label}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/endpoint"
                className="flex-1"
              />
            </div>

            {["POST", "PUT", "PATCH"].includes(method) && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label>Body Type:</Label>
                  <Select value={bodyType} onValueChange={setBodyType}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="json">JSON</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="xml">XML</SelectItem>
                      <SelectItem value="form">Form Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Enter request body...'}
                  className="min-h-[120px] font-mono text-sm"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="headers" className="space-y-4">
            <HeaderManager
              headers={headers}
              onUpdate={onUpdateHeader}
              onRemove={onRemoveHeader}
              onAdd={onAddHeader}
              title="Headers"
            />
          </TabsContent>

          <TabsContent value="params" className="space-y-4">
            <ParameterManager
              params={params}
              onUpdate={onUpdateParam}
              onRemove={onRemoveParam}
              onAdd={onAddParam}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// gRPC Request Configuration Component
interface GrpcRequestConfigProps {
  host: string;
  setHost: (host: string) => void;
  port: string;
  setPort: (port: string) => void;
  service: string;
  setService: (service: string) => void;
  method: string;
  setMethod: (method: string) => void;
  message: string;
  setMessage: (message: string) => void;
  useTLS: boolean;
  setUseTLS: (useTLS: boolean) => void;
  metadata: Header[];
  onAddMetadata: () => void;
  onUpdateMetadata: (index: number, field: keyof Header, value: any) => void;
  onRemoveMetadata: (index: number) => void;
}

function GrpcRequestConfig({
  host,
  setHost,
  port,
  setPort,
  service,
  setService,
  method,
  setMethod,
  message,
  setMessage,
  useTLS,
  setUseTLS,
  metadata,
  onAddMetadata,
  onUpdateMetadata,
  onRemoveMetadata,
}: GrpcRequestConfigProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="w-4 h-4" />
          gRPC Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="connection" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="service">Service</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grpc-host">Host *</Label>
                <Input
                  id="grpc-host"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="localhost"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grpc-port">Port</Label>
                <Input
                  id="grpc-port"
                  type="number"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="50051"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={useTLS}
                onCheckedChange={setUseTLS}
              />
              <Label>Use TLS/SSL</Label>
            </div>
          </TabsContent>

          <TabsContent value="service" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grpc-service">Service *</Label>
                <Input
                  id="grpc-service"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  placeholder="example.GreetingService"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grpc-method">Method *</Label>
                <Input
                  id="grpc-method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  placeholder="SayHello"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grpc-message">Message</Label>
              <Textarea
                id="grpc-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder='{\n  "name": "World"\n}'
                className="min-h-[120px] font-mono text-sm"
              />
            </div>
          </TabsContent>

          <TabsContent value="metadata" className="space-y-4">
            <HeaderManager
              headers={metadata}
              onUpdate={onUpdateMetadata}
              onRemove={onRemoveMetadata}
              onAdd={onAddMetadata}
              title="Metadata"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Shared Header Manager Component
interface HeaderManagerProps {
  headers: Header[];
  onUpdate: (index: number, field: keyof Header, value: any, isGrpc?: boolean) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  title: string;
}

function HeaderManager({ headers, onUpdate, onRemove, onAdd, title }: HeaderManagerProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">{title}</Label>
      </div>
      
      {headers.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-1"></div>
            <div className="col-span-5">Key</div>
            <div className="col-span-5">Value</div>
            <div className="col-span-1"></div>
          </div>
          {headers.map((header, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center group">
              <div className="col-span-1 flex justify-center">
                <input
                  type="checkbox"
                  checked={header.enabled}
                  onChange={(e) => onUpdate(index, 'enabled', e.target.checked)}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                />
              </div>
              <div className="col-span-5">
                <Input
                  value={header.key}
                  onChange={(e) => onUpdate(index, 'key', e.target.value)}
                  placeholder="Key"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-5">
                <Input
                  value={header.value}
                  onChange={(e) => onUpdate(index, 'value', e.target.value)}
                  placeholder="Value"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <Button
                  onClick={() => onRemove(index)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-start pt-3 border-t">
        <Button onClick={onAdd} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add {title.slice(0, -1)}
        </Button>
      </div>
    </div>
  );
}

// Parameter Manager Component
interface ParameterManagerProps {
  params: QueryParam[];
  onUpdate: (index: number, field: keyof QueryParam, value: any) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
}

function ParameterManager({ params, onUpdate, onRemove, onAdd }: ParameterManagerProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Query Parameters</Label>
      </div>
      
      {params.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="col-span-1"></div>
            <div className="col-span-5">Key</div>
            <div className="col-span-5">Value</div>
            <div className="col-span-1"></div>
          </div>
          {params.map((param, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-center group">
              <div className="col-span-1 flex justify-center">
                <input
                  type="checkbox"
                  checked={param.enabled}
                  onChange={(e) => onUpdate(index, 'enabled', e.target.checked)}
                  className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
                />
              </div>
              <div className="col-span-5">
                <Input
                  value={param.key}
                  onChange={(e) => onUpdate(index, 'key', e.target.value)}
                  placeholder="Parameter name"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-5">
                <Input
                  value={param.value}
                  onChange={(e) => onUpdate(index, 'value', e.target.value)}
                  placeholder="Parameter value"
                  className="h-8 text-sm"
                />
              </div>
              <div className="col-span-1 flex justify-center">
                <Button
                  onClick={() => onRemove(index)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-start pt-3 border-t">
        <Button onClick={onAdd} variant="outline" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Parameter
        </Button>
      </div>
    </div>
  );
}