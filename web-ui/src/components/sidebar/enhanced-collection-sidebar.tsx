import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  GalleryVerticalEnd,
  Search,
  Plus,
  MoreVertical,
  Settings,
  ChevronRight,
  ChevronDown,
  Play,
  Trash,
  Edit2,
  Copy,
  HelpCircle,
} from "lucide-react";
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext";
import { appConfig } from "@/config/config";
import { toast } from "@/hooks/use-toast";
import { saveMethodData } from "@/utils/app-utils";
import { NewCollectionDialog } from "@/components/collection/new-collection-dialog";
import { SaveRequestDialog } from "@/components/collection/save-request-dialog";
import { NewRequestDialog } from "@/components/collection/new-request-dialog";
import { RenameCollectionDialog } from "@/components/collection/rename-collection-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Helper function to check if a collection is read-only (sample collection)
const isReadOnlyCollection = (collection: Collection): boolean => {
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

// Helper function to get color for REST method
const getRestMethodColor = (method: string): string => {
  switch (method.toUpperCase()) {
    case 'GET': return 'bg-blue-600';
    case 'POST': return 'bg-green-600';
    case 'PUT': return 'bg-orange-600';
    case 'DELETE': return 'bg-red-600';
    case 'PATCH': return 'bg-purple-600';
    case 'HEAD': return 'bg-gray-600';
    case 'OPTIONS': return 'bg-yellow-600';
    default: return 'bg-gray-500';
  }
};

// Enhanced types for the new system
interface Environment {
  id: string;
  name: string;
  description?: string;
  variables: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Request {
  id: string;
  name: string;
  description?: string;
  type: "grpc" | "rest";
  order: number;
  host: string;
  grpcConfig?: {
    service: string;
    method: string;
    message: any;
    metadata: Array<{ key: string; value: string; enabled: boolean }>;
  };
  restConfig?: {
    method: string;
    url: string;
    headers: Array<{ key: string; value: string; enabled: boolean }>;
    body?: any;
    params?: Array<{ key: string; value: string; enabled: boolean }>;
  };
  variables?: Record<string, string>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface Collection {
  id: string;
  name: string;
  description?: string;
  requests: Request[];
  environments: Environment[];
  variables?: Record<string, string>;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface Workspace {
  collections: Collection[];
  settings?: any;
  createdAt: string;
  updatedAt: string;
}

interface CollectionTreeItemProps {
  collection: Collection;
  onRequestClick: (request: Request) => void;
  activeRequestId?: string;
  onAddRequest?: (collectionId: string) => void;
  onDeleteCollection?: (collectionId: string) => void;
  onRenameCollection?: (collection: Collection) => void;
}

// Individual request item component
function RequestItem({ request, collection, onRequestClick, activeRequestId, handleRenameRequest, handleCloneRequest, handleDeleteRequest }: {
  request: Request;
  collection: Collection;
  onRequestClick: (request: Request) => void;
  activeRequestId: string | undefined;
  handleRenameRequest: (request: Request) => void;
  handleCloneRequest: (request: Request, collection: Collection) => void;
  handleDeleteRequest: (request: Request) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const isReadOnly = isReadOnlyCollection(collection);

  return (
    <SidebarMenuItem key={request.id}>
      <div 
        className="flex items-center w-full hover:bg-sidebar-accent/50 rounded-sm transition-colors"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <SidebarMenuButton
          onClick={() => onRequestClick(request)}
          className={`flex-1 bg-transparent hover:bg-transparent ${activeRequestId === request.id ? 'bg-sidebar-accent' : ''}`}
        >
          <div className="flex items-center gap-2 w-full min-w-0">
            <div className="flex-shrink-0">
              {request.type === "grpc" ? (
                <div className="h-4 w-4 rounded-sm bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                  <div className="h-2 w-2 bg-blue-600 dark:bg-blue-400 rounded-sm"></div>
                </div>
              ) : (
                <div className={`h-4 w-4 rounded-sm flex items-center justify-center text-[8px] font-bold text-white ${getRestMethodColor(request.restConfig?.method || 'GET')}`}>
                  {(request.restConfig?.method || 'GET').substring(0, 1)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-xs truncate">{request.name}</div>
              <div className="text-[9px] text-muted-foreground truncate">
                {request.type === "grpc" ? request.grpcConfig?.method : request.restConfig?.url}
              </div>
            </div>
            <span className="text-[9px] text-muted-foreground/60 bg-muted/50 px-1 py-0.5 rounded-sm font-mono">
              {request.type.toUpperCase()}
            </span>
          </div>
        </SidebarMenuButton>
        
        {/* Request Actions Dropdown - Only show for non-read-only collections */}
        {!isReadOnly && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className={`h-6 w-6 p-0 transition-opacity ml-1 shrink-0 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handleRenameRequest(request)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleCloneRequest(request, collection)}>
                <Copy className="h-4 w-4 mr-2" />
                Clone
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onSelect={() => handleDeleteRequest(request)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </SidebarMenuItem>
  );
}

// Tree item component for collections
function CollectionTreeItem({ collection, onRequestClick, activeRequestId, onAddRequest, onDeleteCollection, onRenameCollection, handleRenameRequest, handleCloneRequest, handleDeleteRequest }: CollectionTreeItemProps & {
  handleRenameRequest: (request: Request) => void;
  handleCloneRequest: (request: Request, collection: Collection) => void;
  handleDeleteRequest: (request: Request) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isReadOnly = isReadOnlyCollection(collection);

  // Sort requests by order
  const sortedRequests = [...collection.requests].sort((a, b) => a.order - b.order);

  const renderRequests = (requests: Request[], indent: number = 0) => {
    return requests.map(request => (
      <RequestItem 
        key={request.id} 
        request={request}
        collection={collection}
        onRequestClick={onRequestClick} 
        activeRequestId={activeRequestId}
        handleRenameRequest={handleRenameRequest}
        handleCloneRequest={handleCloneRequest}
        handleDeleteRequest={handleDeleteRequest}
      />
    ));
  };



  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <div className="flex items-center justify-between w-full">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span>{collection.name}</span>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-muted-foreground bg-muted px-1 py-0.5 rounded">
                {collection.requests.length}
              </span>
              {isReadOnly && (
                <span className="text-[9px] text-orange-600 bg-orange-100 dark:bg-orange-900/20 px-1 py-0.5 rounded">
                  READ-ONLY
                </span>
              )}
            </div>
          </div>

          {!isReadOnly && (
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen} modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-0" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => {
                  setDropdownOpen(false);
                  setTimeout(() => {
                    onAddRequest && onAddRequest(collection.id);
                  }, 100);
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Request
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => {
                  setDropdownOpen(false);
                  setTimeout(() => {
                    onRenameCollection && onRenameCollection(collection);
                  }, 100);
                }}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    setDropdownOpen(false);
                    setTimeout(() => {
                      onDeleteCollection && onDeleteCollection(collection.id);
                    }, 100);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Collection
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </SidebarGroupLabel>

      {isExpanded && (
        <SidebarGroupContent>
          <SidebarMenu>
            {/* All requests directly under collection */}
            {renderRequests(sortedRequests)}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  );
}

export function EnhancedCollectionSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const navigate = useNavigate();
  const {
    setLoading,
    setServerInfo,
    version,
    // serverInfo,
    setRefreshCollection,
  } = React.useContext(GrpcContext) as GrpcContextProps;

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeRequestId, setActiveRequestId] = useState<string>("");
  const [showNewCollectionDialog, setShowNewCollectionDialog] = useState(false);
  const [showNewRequestDialog, setShowNewRequestDialog] = useState(false);
  const [initialCollectionId, setInitialCollectionId] = useState<string | undefined>(undefined);
  const [showDeleteCollectionDialog, setShowDeleteCollectionDialog] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<string | undefined>(undefined);
  const [renameCollection, setRenameCollection] = useState<Collection | null>(null);
  const [footerDropdownOpen, setFooterDropdownOpen] = useState(false);
  
  // Request management state
  const [showDeleteRequestDialog, setShowDeleteRequestDialog] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<Request | null>(null);
  const [showRenameRequestDialog, setShowRenameRequestDialog] = useState(false);
  const [requestToRename, setRequestToRename] = useState<Request | null>(null);
  const [newRequestName, setNewRequestName] = useState<string>("");

  // Load workspace on mount
  useEffect(() => {
    loadWorkspace();
  }, []);

  // Register refresh function with GrpcContext
  useEffect(() => {
    if (setRefreshCollection) {
      setRefreshCollection(() => refreshWorkspaceData);
    }
  }, [setRefreshCollection]);

  const refreshWorkspaceData = async () => {
    try {
      const response = await fetch(`${appConfig.serviceBaseUrl}/collection/workspace`);
      const data = await response.json();
      setWorkspace(data);
    } catch (error) {
      console.error("Error loading workspace:", error);
      toast({
        title: "Error",
        description: "Failed to load collections",
        variant: "destructive",
      });
    }
  };

  const loadWorkspace = async () => {
    try {
      setLoading(true);
      await refreshWorkspaceData();
    } finally {
      setLoading(false);
    }
  };

  const handleRequestClick = (request: Request) => {
    if (request.type === "grpc" && request.grpcConfig) {
      // Normalize method: prefer grpcConfig.method if fully-qualified, otherwise combine service + method
      let method = request.grpcConfig.method || '';
      if (method && method.includes('.') && method.split('.').length > 2) {
        // assume already fully-qualified
      } else if (request.grpcConfig.service) {
        method = `${request.grpcConfig.service}.${method}`;
      }

      // Convert metadata array to object
      const metaData: Record<string, string> = {};
      (request.grpcConfig.metadata || []).forEach((meta: any) => {
        if (meta.enabled) {
          metaData[meta.key] = meta.value;
        }
      });

      // Save to session storage for consistency
      saveMethodData(request.host, method, metaData, request.grpcConfig.message);

      setServerInfo({
        host: request.host,
        method: method,
        id: request.id,
        metaData: metaData,
        message: request.grpcConfig.message || {},
      });

      setActiveRequestId(request.id);

      // Navigate to gRPC page (dashboard)
      navigate('/');

      toast({
        title: "Request Loaded",
        description: `Loaded gRPC request "${request.name}"`,
      });
    } else if (request.type === "rest" && request.restConfig) {
      // Handle REST request loading
      setServerInfo({
        host: request.host,
        method: `${request.restConfig.method} ${request.restConfig.url}`,
        id: request.id,
        type: 'rest',
        restConfig: request.restConfig,
        // For compatibility with gRPC context, provide empty metaData and message
        metaData: {},
        message: {},
      });

      setActiveRequestId(request.id);

      // Navigate to REST page
      navigate('/rest');

      toast({
        title: "REST Request Loaded",
        description: `Loaded REST request "${request.name}"`,
      });
    }
  };

  const handleDeleteCollection = async (collectionId: string) => {
    setCollectionToDelete(collectionId);
    setShowDeleteCollectionDialog(true);
  };

  const confirmDeleteCollection = async () => {
    if (!collectionToDelete) return;

    try {
      setLoading(true);
      const response = await fetch(`${appConfig.serviceBaseUrl}/collection/collections/${collectionToDelete}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.status === 'success') {
        toast({
          title: "Success",
          description: "Collection deleted successfully",
        });
        // Refresh the sidebar without additional loading state
        await refreshWorkspaceData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete collection",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting collection:', error);
      toast({
        title: "Error",
        description: "Failed to delete collection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowDeleteCollectionDialog(false);
      setCollectionToDelete(undefined);
    }
  };

  // Request management handlers
  const handleRenameRequest = (request: Request) => {
    setRequestToRename(request);
    setNewRequestName(request.name);
    setShowRenameRequestDialog(true);
  };

  const handleDeleteRequest = (request: Request) => {
    setRequestToDelete(request);
    setShowDeleteRequestDialog(true);
  };

  const handleCloseRenameDialog = (open: boolean) => {
    if (!open) {
      setShowRenameRequestDialog(false);
      setRequestToRename(null);
      setNewRequestName("");
    }
  };

  const handleCloseDeleteRequestDialog = (open: boolean) => {
    if (!open) {
      setShowDeleteRequestDialog(false);
      setRequestToDelete(null);
    }
  };

  const handleCloseDeleteCollectionDialog = (open: boolean) => {
    if (!open) {
      setShowDeleteCollectionDialog(false);
      setCollectionToDelete(undefined);
    }
  };

  const handleCloneRequest = async (request: Request, collection: Collection) => {
    try {
      setLoading(true);
      
      // Create a clone of the request with a new name
      const timestamp = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }).replace(/:/g, '');
      const cloneName = `${request.name} (Copy ${timestamp})`;
      const cloneRequest = {
        ...request,
        name: cloneName,
        id: undefined, // Remove ID so backend assigns a new one
      };

      const response = await fetch(`${appConfig.serviceBaseUrl}/collection/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: collection.id,
          request: cloneRequest,
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        toast({
          title: "Success",
          description: `Request "${cloneName}" cloned successfully`,
        });
        await refreshWorkspaceData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to clone request",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error cloning request:', error);
      toast({
        title: "Error",
        description: "Failed to clone request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmRenameRequest = async () => {
    if (!requestToRename || !newRequestName.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(`${appConfig.serviceBaseUrl}/collection/requests/${requestToRename.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRequestName.trim(),
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        toast({
          title: "Success",
          description: "Request renamed successfully",
        });
        await refreshWorkspaceData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to rename request",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error renaming request:', error);
      toast({
        title: "Error",
        description: "Failed to rename request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowRenameRequestDialog(false);
      setRequestToRename(null);
      setNewRequestName("");
    }
  };

  const confirmDeleteRequest = async () => {
    if (!requestToDelete) return;

    try {
      setLoading(true);
      const response = await fetch(`${appConfig.serviceBaseUrl}/collection/requests/${requestToDelete.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.status === 'success') {
        toast({
          title: "Success",
          description: "Request deleted successfully",
        });
        await refreshWorkspaceData();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete request",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: "Error",
        description: "Failed to delete request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowDeleteRequestDialog(false);
      setRequestToDelete(null);
    }
  };

  // Filter and sort collections - read-only collections at bottom
  const filteredCollections = React.useMemo(() => {
    const filtered = workspace?.collections.filter(collection =>
      collection.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collection.requests.some(request =>
        request.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    ) || [];

    // Sort: editable collections first, then read-only collections
    return filtered.sort((a, b) => {
      const aIsReadOnly = isReadOnlyCollection(a);
      const bIsReadOnly = isReadOnlyCollection(b);

      if (aIsReadOnly && !bIsReadOnly) return 1;  // a goes after b
      if (!aIsReadOnly && bIsReadOnly) return -1; // a goes before b

      // If both have same read-only status, sort alphabetically
      return a.name.localeCompare(b.name);
    });
  }, [workspace?.collections, searchTerm]);

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GalleryVerticalEnd className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">gRPC Client</span>
                  <span className="truncate text-xs">v{version}</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Search */}
        <SidebarGroup>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search collections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </SidebarGroup>

        {/* Collections */}
        {filteredCollections.map((collection) => (
          <CollectionTreeItem
            key={collection.id}
            collection={collection}
            onRequestClick={handleRequestClick}
            activeRequestId={activeRequestId}
            onAddRequest={(collectionId: string) => {
              const collection = workspace?.collections.find(c => c.id === collectionId);
              if (collection && isReadOnlyCollection(collection)) {
                toast({
                  title: "Read-only Collection",
                  description: "Cannot add requests to sample collections. They are for demonstration only.",
                  variant: "destructive",
                });
                return;
              }
              setInitialCollectionId(collectionId);
              setShowNewRequestDialog(true);
            }}
            onDeleteCollection={handleDeleteCollection}
            onRenameCollection={setRenameCollection}
            handleRenameRequest={handleRenameRequest}
            handleCloneRequest={handleCloneRequest}
            handleDeleteRequest={handleDeleteRequest}
          />
        ))}

        {/* Empty state */}
        {filteredCollections.length === 0 && (
          <SidebarGroup>
            <div className="text-center text-muted-foreground p-4">
              {searchTerm ? "No matching requests found" : "No collections yet"}
            </div>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu open={footerDropdownOpen} onOpenChange={setFooterDropdownOpen} modal={false}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <Settings className="size-4" />
                  <span>Settings</span>
                  <ChevronRight className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onSelect={() => {
                  setFooterDropdownOpen(false);
                  setTimeout(() => {
                    setShowNewCollectionDialog(true);
                  }, 100);
                }}>
                  <Plus className="size-4 mr-2" />
                  <span>New Collection</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => {
                  setFooterDropdownOpen(false);
                  setTimeout(() => {
                    setShowNewRequestDialog(true);
                  }, 100);
                }}>
                  <Play className="size-4 mr-2" />
                  <span>New Request</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => {
                  setFooterDropdownOpen(false);
                  setTimeout(() => {
                    window.location.href = '/settings';
                  }, 100);
                }}>
                  <Settings className="size-4 mr-2" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => {
                  setFooterDropdownOpen(false);
                  setTimeout(() => {
                    window.location.href = '/help';
                  }, 100);
                }}>
                  <HelpCircle className="size-4 mr-2" />
                  <span>Help</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      {/* Dialogs for creating collections and saving requests */}
      <NewCollectionDialog
        open={showNewCollectionDialog}
        onOpenChange={(open) => {
          if (!open) setShowNewCollectionDialog(false);
        }}
        onSuccess={() => {
          refreshWorkspaceData();
          setShowNewCollectionDialog(false);
        }}
      />

      <NewRequestDialog
        isOpen={showNewRequestDialog}
        onClose={() => {
          setShowNewRequestDialog(false);
          setInitialCollectionId(undefined);
        }}
        collections={workspace?.collections || []}
        initialCollectionId={initialCollectionId}
        onSaved={() => {
          refreshWorkspaceData();
          setShowNewRequestDialog(false);
          setInitialCollectionId(undefined);
        }}
      />

      <RenameCollectionDialog
        open={renameCollection !== null}
        onOpenChange={(open) => {
          if (!open) setRenameCollection(null);
        }}
        collection={renameCollection}
        onSuccess={() => {
          refreshWorkspaceData();
          setRenameCollection(null);
        }}
      />

      <AlertDialog open={showDeleteCollectionDialog} onOpenChange={handleCloseDeleteCollectionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this collection? All requests and folders in this collection will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCollection}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Collection
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Request Dialog */}
      <AlertDialog open={showRenameRequestDialog} onOpenChange={handleCloseRenameDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Request</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new name for "{requestToRename?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={newRequestName}
              onChange={(e) => setNewRequestName(e.target.value)}
              placeholder="Enter request name"
              className="w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  confirmRenameRequest();
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRenameRequest}
              disabled={!newRequestName.trim()}
            >
              Rename Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Request Dialog */}
      <AlertDialog open={showDeleteRequestDialog} onOpenChange={handleCloseDeleteRequestDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{requestToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteRequest}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Sidebar>
  );
}