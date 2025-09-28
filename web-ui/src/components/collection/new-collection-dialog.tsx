import { useState } from "react";
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
import { toast } from "@/hooks/use-toast";
import { appConfig } from "@/config/config";
import { Folder, Plus } from "lucide-react";

interface NewCollectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewCollectionDialog({ isOpen, onClose, onSuccess }: NewCollectionDialogProps) {
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCollection = async () => {
    if (!collectionName.trim()) {
      toast({
        title: "Validation Error",
        description: "Collection name is required",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch(`${appConfig.serviceBaseUrl}/v2/collection/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: collectionName.trim(),
          description: collectionDescription.trim(),
        }),
      });

      const result = await response.json();

      if (result.status === 'success') {
        toast({
          title: "Success",
          description: `Collection "${collectionName}" created successfully`,
        });
        
        // Reset form
        setCollectionName("");
        setCollectionDescription("");
        
        // Close dialog and refresh
        onClose();
        onSuccess();
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to create collection",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating collection:', error);
      toast({
        title: "Error",
        description: "Failed to create collection. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setCollectionName("");
      setCollectionDescription("");
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Create New Collection
          </AlertDialogTitle>
          <AlertDialogDescription>
            Create a new collection to organize your gRPC requests.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="collection-name">Collection Name *</Label>
            <Input
              id="collection-name"
              placeholder="e.g., User Service API"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCreateCollection();
                }
              }}
              disabled={isCreating}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="collection-description">Description</Label>
            <Textarea
              id="collection-description"
              placeholder="Optional description for this collection..."
              value={collectionDescription}
              onChange={(e) => setCollectionDescription(e.target.value)}
              rows={3}
              disabled={isCreating}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateCollection}
            disabled={!collectionName.trim() || isCreating}
          >
            {isCreating ? (
              <>
                <Plus className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Collection
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}