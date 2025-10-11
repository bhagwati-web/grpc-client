import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileText, AlertCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GrpcContext, GrpcContextProps } from '@/providers/GrpcContext';
import { appConfig } from '@/config/config';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Layout from '@/components/layout';

export default function SettingsPage() {
    const { toast } = useToast();
    const { collection, refreshCollection } = React.useContext(GrpcContext) as GrpcContextProps;
    const [isExporting, setIsExporting] = React.useState(false);
    const [isImporting, setIsImporting] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const exportCollections = async () => {
        try {
            setIsExporting(true);

            // Get workspace from the enhanced API
            const response = await fetch(`${appConfig.serviceBaseUrl}/collection/workspace/export`);
            if (!response.ok) {
                throw new Error('Failed to fetch workspace');
            }

            const workspace = await response.json();

            // Create and download the JSON file with a timestamp
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const dataStr = JSON.stringify(workspace, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `workspace_export_${timestamp}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
                title: "Export Successful",
                description: `Exported ${workspace.collections?.length || 0} collections to workspace_export_${timestamp}.json`,
            });
        } catch (error) {
            console.error('Export error:', error);
            toast({
                title: "Export Failed",
                description: "Failed to export workspace. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsExporting(false);
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            importCollections(file);
        }
    };

    const importCollections = async (file: File) => {
        try {
            setIsImporting(true);

            // Read the file
            const fileContent = await file.text();
            let importedWorkspace;

            try {
                importedWorkspace = JSON.parse(fileContent);
            } catch (parseError) {
                throw new Error('Invalid JSON file format');
            }

            // Validate workspace structure
            if (!importedWorkspace || typeof importedWorkspace !== 'object') {
                throw new Error('Invalid workspace format: expected a workspace object');
            }

            if (!importedWorkspace.collections || !Array.isArray(importedWorkspace.collections)) {
                throw new Error('Invalid workspace format: missing collections array');
            }

            // Import the workspace
            const response = await fetch(`${appConfig.serviceBaseUrl}/collection/workspace/import`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(importedWorkspace),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to import workspace' }));
                throw new Error(errorData.error || 'Failed to import workspace');
            }

            // Refresh the collection display
            if (refreshCollection) {
                refreshCollection();
            }

            toast({
                title: "Import Successful",
                description: `Successfully imported ${importedWorkspace.collections.length} collections`,
            });

        } catch (error) {
            console.error('Import error:', error);
            toast({
                title: "Import Failed",
                description: error instanceof Error ? error.message : "Failed to import workspace. Please check the file format.",
                variant: "destructive",
            });
        } finally {
            setIsImporting(false);
            // Reset the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleBackToHome = () => {
        window.location.href = '/';
    };

    return (
        <Layout title="Settings" breadcrumbs={[{ label: "Settings" }]} showSidebar={false}>
            <div className="p-1">
                <div className="grid gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Collection Management
                            </CardTitle>
                            <CardDescription>
                                Export your workspace to a JSON file or import a workspace from a previously exported file.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Exported workspace will be saved as <code>workspace_export_[timestamp].json</code>.
                                    When importing, the entire current workspace will be replaced with the imported data.
                                </AlertDescription>
                            </Alert>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Export Section */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Export Workspace</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Download your entire workspace including all collections, requests, and environments as a JSON file.
                                    </p>
                                    <Button
                                        onClick={exportCollections}
                                        disabled={isExporting}
                                        className="w-full"
                                        variant="outline"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        {isExporting ? 'Exporting...' : 'Export Workspace'}
                                    </Button>
                                    {collection && collection.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            {collection.length} collection group(s) available for export
                                        </p>
                                    )}
                                </div>

                                {/* Import Section */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Import Workspace</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Upload a previously exported workspace file to restore your entire setup.
                                    </p>
                                    <Button
                                        onClick={triggerFileInput}
                                        disabled={isImporting}
                                        className="w-full"
                                        variant="outline"
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        {isImporting ? 'Importing...' : 'Import Workspace'}
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileSelect}
                                        style={{ display: 'none' }}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Only workspace JSON files exported from this application are supported
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Additional Settings Cards can be added here */}
                    <Card>
                        <CardHeader>
                            <CardTitle>About</CardTitle>
                            <CardDescription>
                                gRPC Client application information
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">Version:</span>
                                        <span className="text-sm text-muted-foreground">v3.5.0</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">Collection Storage:</span>
                                        <span className="text-sm text-muted-foreground">~/.pulse/</span>
                                    </div>
                                </div>
                                <div className="pt-2">
                                    <Button 
                                        onClick={handleBackToHome}
                                        className="w-full flex items-center gap-2"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to Home
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Layout>
    );
}
