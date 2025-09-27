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

            // Get all collections from the API
            const response = await fetch(`${appConfig.serviceBaseUrl + appConfig.collectionBaseUrl + appConfig.collectionLoadUrl}`);
            if (!response.ok) {
                throw new Error('Failed to fetch collections');
            }

            const collections = await response.json();

            // Create and download the JSON file
            const dataStr = JSON.stringify(collections, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });

            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'collection_exported.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast({
                title: "Export Successful",
                description: `Exported ${collections.length} collections to collection_exported.json`,
            });
        } catch (error) {
            console.error('Export error:', error);
            toast({
                title: "Export Failed",
                description: "Failed to export collections. Please try again.",
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
            let importedCollections;

            try {
                importedCollections = JSON.parse(fileContent);
            } catch (parseError) {
                throw new Error('Invalid JSON file format');
            }

            // Validate the structure
            if (!Array.isArray(importedCollections)) {
                throw new Error('Invalid collection format: expected an array');
            }

            let successCount = 0;
            let errorCount = 0;

            // Import each collection item
            for (const collectionGroup of importedCollections) {
                if (!collectionGroup.items || !Array.isArray(collectionGroup.items)) {
                    continue;
                }

                for (const item of collectionGroup.items) {
                    try {
                        // Prepare the data for saving
                        const saveData = {
                            host: item.Host || item.host,
                            method: `${item.Service || item.service}.${item.RequestName || item.requestName}`,
                            message: item.Message || item.message || {},
                            metaData: item.MetaData || item.metaData || {},
                            service: item.Service || item.service,
                        };

                        // Save the collection item
                        const response = await fetch(`${appConfig.serviceBaseUrl + appConfig.collectionBaseUrl + appConfig.collectionSaveUrl}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(saveData),
                        });

                        if (response.ok) {
                            successCount++;
                        } else {
                            errorCount++;
                            console.error(`Failed to import item: ${item.RequestName || item.requestName}`);
                        }
                    } catch (itemError) {
                        errorCount++;
                        console.error('Error importing item:', itemError);
                    }
                }
            }

            // Refresh the collection display
            if (refreshCollection) {
                refreshCollection();
            }

            toast({
                title: "Import Completed",
                description: `Successfully imported ${successCount} items${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
                variant: errorCount > 0 ? "destructive" : "default",
            });

        } catch (error) {
            console.error('Import error:', error);
            toast({
                title: "Import Failed",
                description: error instanceof Error ? error.message : "Failed to import collections. Please check the file format.",
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
                                Export your collections to a JSON file or import collections from a previously exported file.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    Exported collections will be saved as <code>collection_exported.json</code>.
                                    When importing, existing collections with the same name and method will be overwritten.
                                </AlertDescription>
                            </Alert>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Export Section */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Export Collections</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Download all your saved collections as a JSON file.
                                    </p>
                                    <Button
                                        onClick={exportCollections}
                                        disabled={isExporting}
                                        className="w-full"
                                        variant="outline"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        {isExporting ? 'Exporting...' : 'Export Collections'}
                                    </Button>
                                    {collection && collection.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            {collection.length} collection group(s) available for export
                                        </p>
                                    )}
                                </div>

                                {/* Import Section */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Import Collections</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Upload a previously exported JSON file to restore collections.
                                    </p>
                                    <Button
                                        onClick={triggerFileInput}
                                        disabled={isImporting}
                                        className="w-full"
                                        variant="outline"
                                    >
                                        <Upload className="h-4 w-4 mr-2" />
                                        {isImporting ? 'Importing...' : 'Import Collections'}
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".json"
                                        onChange={handleFileSelect}
                                        style={{ display: 'none' }}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Only JSON files exported from this application are supported
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
                                        <span className="text-sm text-muted-foreground">~/.grpc-client/</span>
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
