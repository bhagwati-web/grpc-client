import React, { useState, useEffect } from "react";
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
  Globe,
  Play,
  Trash,
  Edit2,
} from "lucide-react";
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext";
import { appConfig } from "@/config/config";
import { toast } from "@/hooks/use-toast";
import { saveMethodData } from "@/utils/app-utils";
import { NewCollectionDialog } from "@/components/collection/new-collection-dialog";
import { SaveRequestDialog } from "@/components/collection/save-request-dialog";
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

// Tree item component for collections
function CollectionTreeItem({ collection, onRequestClick, activeRequestId, onAddRequest, onDeleteCollection, onRenameCollection }: CollectionTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const isReadOnly = isReadOnlyCollection(collection);

  // Sort requests by order
  const sortedRequests = [...collection.requests].sort((a, b) => a.order - b.order);

  const renderRequests = (requests: Request[], indent: number = 0) => {
    return requests.map(request => (
      <SidebarMenuItem key={request.id}>
        <SidebarMenuButton
          onClick={() => onRequestClick(request)}
          className={`pl-${4 + indent * 4} ${activeRequestId === request.id ? 'bg-sidebar-accent' : ''}`}
        >
          <div className="flex items-center gap-2 w-full min-w-0">
            <div className="flex-shrink-0">
              {request.type === "grpc" ? (
                <Play className="h-4 w-4 text-blue-500" />
              ) : (
                <Globe className="h-4 w-4 text-green-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm truncate">{request.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {request.type === "grpc" ? request.grpcConfig?.method : request.restConfig?.url}
              </div>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
              {request.type.toUpperCase()}
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
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
              <span className="text-xs text-muted-foreground bg-muted px-1 py-0.5 rounded">
                {collection.requests.length}
              </span>
              {isReadOnly && (
                <span className="text-xs text-orange-600 bg-orange-100 dark:bg-orange-900/20 px-1 py-0.5 rounded">
                  READ-ONLY
                </span>
              )}
            </div>
          </div>
          
          {!isReadOnly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => onAddRequest && onAddRequest(collection.id)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Request
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => onRenameCollection && onRenameCollection(collection)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onSelect={() => onDeleteCollection && onDeleteCollection(collection.id)}
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
  const {
    setLoading,
    setServerInfo,
    version,
    serverInfo,
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
      const response = await fetch(`${appConfig.serviceBaseUrl}/v2/collection/workspace`);
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

      toast({
        title: "Request Loaded",
        description: `Loaded "${request.name}" request`,
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
      const response = await fetch(`${appConfig.serviceBaseUrl}/v2/collection/collections/${collectionToDelete}`, {
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
            <DropdownMenu>
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
                <DropdownMenuItem onSelect={() => setShowNewCollectionDialog(true)}>
                  <Plus className="size-4 mr-2" />
                  <span>New Collection</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShowNewRequestDialog(true)}>
                  <Play className="size-4 mr-2" />
                  <span>New Request</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => window.location.href = '/settings'}>
                  <Settings className="size-4 mr-2" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
        {/* Dialogs for creating collections and saving requests */}
        <NewCollectionDialog
          isOpen={showNewCollectionDialog}
          onClose={() => setShowNewCollectionDialog(false)}
          onSuccess={() => {
            refreshWorkspaceData();
            setShowNewCollectionDialog(false);
          }}
        />

        <SaveRequestDialog
          isOpen={showNewRequestDialog}
          onClose={() => {
            setShowNewRequestDialog(false);
            setInitialCollectionId(undefined);
          }}
          serverInfo={{ host: '', method: '', message: {}, metaData: {} }} // Always fresh for sidebar
          collections={workspace?.collections || []}
          initialCollectionId={initialCollectionId}
          prefillFromCurrent={false} // Explicitly set to false for fresh dialogs
          onSaved={() => {
            refreshWorkspaceData();
            setShowNewRequestDialog(false);
            setInitialCollectionId(undefined);
          }}
        />

        <RenameCollectionDialog
          isOpen={renameCollection !== null}
          onClose={() => setRenameCollection(null)}
          collection={renameCollection}
          onSuccess={() => {
            refreshWorkspaceData();
            setRenameCollection(null);
          }}
        />

        <AlertDialog open={showDeleteCollectionDialog} onOpenChange={setShowDeleteCollectionDialog}>
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

    </Sidebar>
  );
}