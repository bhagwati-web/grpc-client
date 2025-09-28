
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Book, ExternalLink, HelpCircle, Server, Zap } from 'lucide-react';
import Layout from '@/components/layout';

export default function HelpPage() {
    const handleBackToHome = () => {
        window.location.href = '/';
    };

    const openExternalLink = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <Layout title="Help" breadcrumbs={[{ label: "Help" }]} showSidebar={false}>
            <div className="space-y-6">
                {/* Installation Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5" />
                            Installation & Setup
                        </CardTitle>
                        <CardDescription>
                            Multiple ways to install and run the gRPC Client
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">
                                    Option 1: Homebrew (macOS) - Recommended
                                </h4>
                                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-md">
                                    <code className="text-sm">
                                        # Install via Homebrew<br/>
                                        brew tap bhagwati-web/grpc-client<br/>
                                        brew install grpc-client<br/><br/>
                                        # Start the server<br/>
                                        grpcstart<br/><br/>
                                        # Stop the server<br/>
                                        grpcstop
                                    </code>
                                </div>
                            </div>
                            
                            <div>
                                <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">
                                    Option 2: Direct Binary
                                </h4>
                                <ol className="text-sm text-muted-foreground space-y-1">
                                    <li>1. Download binary from <a href="https://github.com/bhagwati-web/grpc-client/releases" className="text-blue-600 hover:underline" target="_blank" rel="noopener">GitHub Releases</a></li>
                                    <li>2. Make executable: <code className="bg-muted px-1 py-0.5 rounded">chmod +x grpc-client</code></li>
                                    <li>3. Run: <code className="bg-muted px-1 py-0.5 rounded">./grpc-client</code></li>
                                    <li>4. Open: <code className="bg-muted px-1 py-0.5 rounded">http://localhost:50051</code></li>
                                </ol>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Getting Started Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Book className="h-5 w-5" />
                            Making Your First gRPC Call
                        </CardTitle>
                        <CardDescription>
                            Step-by-step guide to making your first request
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400">
                                    1
                                </div>
                                <div>
                                    <h4 className="font-medium">Enter gRPC Endpoint</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Enter a public gRPC server: <code className="bg-muted px-1 py-0.5 rounded">grpcb.in:443</code>
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400">
                                    2
                                </div>
                                <div>
                                    <h4 className="font-medium">Select Method</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Choose <code className="bg-muted px-1 py-0.5 rounded">addsvc.Add.Sum</code> from the dropdown
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400">
                                    3
                                </div>
                                <div>
                                    <h4 className="font-medium">Build Request</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Use the Message tab to enter JSON: <code className="bg-muted px-1 py-0.5 rounded">{"{"}"a": 10, "b": 20{"}"}</code>
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-400">
                                    4
                                </div>
                                <div>
                                    <h4 className="font-medium">Send & View Response</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Click Send to get the response with syntax highlighting
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Features Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="h-5 w-5" />
                            Key Features
                        </CardTitle>
                        <CardDescription>
                            Comprehensive gRPC client with modern web interface
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <h4 className="font-medium flex items-center gap-2">
                                    ✅ gRPC Client
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Test and interact with gRPC services
                                </p>
                            </div>
                            
                            <div className="space-y-2">
                                <h4 className="font-medium flex items-center gap-2">
                                    ✅ Server Reflection
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Automatic service discovery
                                </p>
                            </div>
                            
                            <div className="space-y-2">
                                <h4 className="font-medium flex items-center gap-2">
                                    ✅ Request Builder
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    GUI request builder based on proto
                                </p>
                            </div>
                            
                            <div className="space-y-2">
                                <h4 className="font-medium flex items-center gap-2">
                                    ✅ Sample Generation
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Auto-generate requests from protobuf
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-medium flex items-center gap-2">
                                    ✅ Collection Management
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Save and organize requests
                                </p>
                            </div>
                            
                            <div className="space-y-2">
                                <h4 className="font-medium flex items-center gap-2">
                                    ✅ React Web UI
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Modern, responsive interface with dark mode
                                </p>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-medium flex items-center gap-2">
                                    ✅ Single Binary
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    No dependencies, easy deployment
                                </p>
                            </div>
                            
                            <div className="space-y-2">
                                <h4 className="font-medium flex items-center gap-2">
                                    ✅ Cross-Platform
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    Works on macOS, Linux, and Windows
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Troubleshooting Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HelpCircle className="h-5 w-5" />
                            Troubleshooting
                        </CardTitle>
                        <CardDescription>
                            Common issues and solutions
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-red-600 dark:text-red-400">
                                    Collections not saving properly
                                </h4>
                                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                                    <li>• If collections are not saving, restart the gRPC client:</li>
                                    <li className="ml-4">- Run <code className="bg-muted px-1 py-0.5 rounded">grpcstop</code> to stop the server</li>
                                    <li className="ml-4">- Run <code className="bg-muted px-1 py-0.5 rounded">grpcstart</code> to start it again</li>
                                    <li>• This is a known issue and will be fixed in the next version</li>
                                </ul>
                            </div>
                            
                            <div>
                                <h4 className="font-medium text-amber-600 dark:text-amber-400">
                                    Cannot connect to gRPC server
                                </h4>
                                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                                    <li>• Check if the server address is correct and includes the port</li>
                                    <li>• Verify the server is running and accessible</li>
                                    <li>• Check if TLS is required (use https:// prefix if needed)</li>
                                    <li>• For local servers, use <code className="bg-muted px-1 py-0.5 rounded">localhost:port</code></li>
                                </ul>
                            </div>
                            
                            <div>
                                <h4 className="font-medium text-amber-600 dark:text-amber-400">
                                    "Failed to load reflection info" error
                                </h4>
                                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                                    <li>• Verify the gRPC server has reflection enabled</li>
                                    <li>• Check if the server requires authentication</li>
                                    <li>• Try using a known public gRPC server (like <code className="bg-muted px-1 py-0.5 rounded">grpcb.in:443</code>) to test</li>
                                    <li>• Ensure firewall allows the connection</li>
                                </ul>
                            </div>
                            
                            <div>
                                <h4 className="font-medium text-amber-600 dark:text-amber-400">
                                    UI not loading
                                </h4>
                                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                                    <li>• Clear browser cache and reload</li>
                                    <li>• Check if the correct port is being used (default: 50051)</li>
                                    <li>• Verify no other service is using port 50051</li>
                                    <li>• Try a different browser or incognito mode</li>
                                </ul>
                            </div>

                            <div>
                                <h4 className="font-medium text-amber-600 dark:text-amber-400">
                                    Permission denied when running binary
                                </h4>
                                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                                    <li>• Run <code className="bg-muted px-1 py-0.5 rounded">chmod +x grpc-client</code> to make executable</li>
                                    <li>• On macOS, allow the application in Security & Privacy settings</li>
                                    <li>• Check if antivirus software is blocking execution</li>
                                </ul>
                            </div>
                            
                            <div>
                                <h4 className="font-medium text-green-600 dark:text-green-400">
                                    Debug Mode
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1 mb-2">Run server with detailed logging:</p>
                                <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded-md">
                                    <code className="text-sm">GIN_MODE=debug ./grpc-client</code>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* REST API Usage Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="h-5 w-5" />
                            Using REST API (Without GUI)
                        </CardTitle>
                        <CardDescription>
                            Integrate gRPC Client into your applications using REST API calls
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mb-4">
                            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">💡 Why Use REST API?</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                The gRPC Client exposes all functionality through REST endpoints, making it perfect for CLI tools, 
                                custom frontends, CI/CD pipelines, and integration with other applications.
                            </p>
                        </div>

                        <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg mb-4">
                            <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">🏗️ Workspace Architecture (v2 API)</h4>
                            <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">
                                The enhanced v2 API introduces a <strong>workspace</strong> concept that contains all your collections, requests, and environments in a structured format:
                            </p>
                            <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                                <li>• <strong>Workspace</strong> - Root container for your entire setup</li>
                                <li>• <strong>Collections</strong> - Groups of related requests (e.g., "User API", "Payment API")</li>
                                <li>• <strong>Requests</strong> - Individual gRPC calls with saved parameters</li>
                                <li>• <strong>Environments</strong> - Variable sets for different deployment targets</li>
                            </ul>
                            <p className="text-sm text-purple-700 dark:text-purple-300 mt-2">
                                <strong>Benefits:</strong> Better organization, atomic import/export, collection renaming, and future-ready architecture.
                            </p>
                        </div>

                        {/* API Endpoints */}
                        <div>
                            <h4 className="font-medium text-lg mb-3">Available Endpoints</h4>
                            
                            <div className="mb-4">
                                <h5 className="font-medium text-base mb-2 text-blue-600 dark:text-blue-400">Core gRPC & Reflection</h5>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="p-3 border rounded-lg">
                                        <div className="font-mono text-sm font-medium text-green-600 dark:text-green-400">POST /grpc/call</div>
                                        <p className="text-xs text-muted-foreground mt-1">Execute gRPC requests</p>
                                    </div>
                                    <div className="p-3 border rounded-lg">
                                        <div className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">GET /metadata/:host</div>
                                        <p className="text-xs text-muted-foreground mt-1">Get server reflection data</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <h5 className="font-medium text-base mb-2 text-purple-600 dark:text-purple-400">Workspace & Collections</h5>
                                <div className="grid gap-3 md:grid-cols-2">
                                    <div className="p-3 border rounded-lg">
                                        <div className="font-mono text-sm font-medium text-purple-600 dark:text-purple-400">GET /collection/workspace</div>
                                        <p className="text-xs text-muted-foreground mt-1">Load complete workspace</p>
                                    </div>
                                    <div className="p-3 border rounded-lg">
                                        <div className="font-mono text-sm font-medium text-purple-600 dark:text-purple-400">GET /collection/workspace/export</div>
                                        <p className="text-xs text-muted-foreground mt-1">Export entire workspace</p>
                                    </div>
                                    <div className="p-3 border rounded-lg">
                                        <div className="font-mono text-sm font-medium text-purple-600 dark:text-purple-400">POST /collection/workspace/import</div>
                                        <p className="text-xs text-muted-foreground mt-1">Import workspace backup</p>
                                    </div>
                                    <div className="p-3 border rounded-lg">
                                        <div className="font-mono text-sm font-medium text-indigo-600 dark:text-indigo-400">POST /collection/collections</div>
                                        <p className="text-xs text-muted-foreground mt-1">Create new collection</p>
                                    </div>
                                    <div className="p-3 border rounded-lg">
                                        <div className="font-mono text-sm font-medium text-indigo-600 dark:text-indigo-400">PUT /collection/collections/:id</div>
                                        <p className="text-xs text-muted-foreground mt-1">Update collection (rename)</p>
                                    </div>
                                    <div className="p-3 border rounded-lg">
                                        <div className="font-mono text-sm font-medium text-red-600 dark:text-red-400">DELETE /collection/collections/:id</div>
                                        <p className="text-xs text-muted-foreground mt-1">Delete collection</p>
                                    </div>
                                </div>
                            </div>


                        </div>

                        {/* Basic gRPC Call */}
                        <div>
                            <h4 className="font-medium text-lg mb-3">1. Making a gRPC Call</h4>
                            <p className="text-sm text-muted-foreground mb-3">Use curl to make gRPC requests:</p>
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto">
                                <code className="text-sm whitespace-pre">{`curl -X POST http://localhost:50051/grpc/call \\
  -H "Content-Type: application/json" \\
  -d '{
    "host": "grpcb.in:443",
    "method": "addsvc.Add.Sum",
    "message": {"a": 2, "b": 3},
    "metaData": {"authorization": "Bearer token"}
  }'`}</code>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">Response:</p>
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto">
                                <code className="text-sm whitespace-pre">{`{
  "success": true,
  "response": {
    "sum": 5
  },
  "error": null,
  "metadata": {
    "content-type": ["application/grpc"]
  }
}`}</code>
                            </div>
                        </div>

                        {/* Server Reflection */}
                        <div>
                            <h4 className="font-medium text-lg mb-3">2. Getting Server Reflection</h4>
                            <p className="text-sm text-muted-foreground mb-3">Discover available services and methods:</p>
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto">
                                <code className="text-sm whitespace-pre">{`curl http://localhost:50051/metadata/grpcb.in:443`}</code>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">Response:</p>
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto">
                                <code className="text-sm whitespace-pre">{`{
  "services": [
    {
      "name": "addsvc.Add",
      "methods": [
        {
          "name": "Sum",
          "inputType": "AddRequest",
          "outputType": "AddResponse"
        }
      ]
    }
  ],
  "error": null
}`}</code>
                            </div>
                        </div>

                        {/* Workspace & Collection Management */}
                        <div>
                            <h4 className="font-medium text-lg mb-3">3. Workspace & Collection Management</h4>
                            <div className="space-y-6">
                                
                                <div>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-sm font-medium mb-2">Load Complete Workspace:</p>
                                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto">
                                                <code className="text-sm whitespace-pre">{`curl http://localhost:50051/collection/workspace`}</code>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-sm font-medium mb-2">Create New Collection:</p>
                                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto">
                                                <code className="text-sm whitespace-pre">{`curl -X POST http://localhost:50051/collection/collections \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My API Tests",
    "description": "Collection for testing my API"
  }'`}</code>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-sm font-medium mb-2">Rename Collection:</p>
                                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto">
                                                <code className="text-sm whitespace-pre">{`curl -X PUT http://localhost:50051/collection/collections/COLLECTION_ID \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Updated Collection Name",
    "description": "New description"
  }'`}</code>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-sm font-medium mb-2">Export Workspace (with timestamp):</p>
                                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto">
                                                <code className="text-sm whitespace-pre">{`curl http://localhost:50051/collection/workspace/export > workspace_backup.json`}</code>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-sm font-medium mb-2">Import Workspace:</p>
                                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto">
                                                <code className="text-sm whitespace-pre">{`curl -X POST http://localhost:50051/collection/workspace/import \\
  -H "Content-Type: application/json" \\
  -d @workspace_backup.json`}</code>
                                            </div>
                                        </div>
                                    </div>
                                </div>


                            </div>
                        </div>

                        {/* JavaScript/AJAX Example */}
                        <div>
                            <h4 className="font-medium text-lg mb-3">4. JavaScript/AJAX Integration</h4>
                            <p className="text-sm text-muted-foreground mb-3">Integrate into web applications:</p>
                            
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium mb-2">Make a gRPC Call:</p>
                                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto">
                                        <code className="text-sm whitespace-pre">{`// Make a gRPC call using fetch
async function callGrpcService() {
  try {
    const response = await fetch('http://localhost:50051/grpc/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        host: 'grpcb.in:443',
        method: 'addsvc.Add.Sum',
        message: { a: 10, b: 20 },
        metaData: { authorization: 'Bearer your-token' }
      })
    });
    
    const result = await response.json();
    console.log('gRPC Response:', result.response);
  } catch (error) {
    console.error('Error:', error);
  }
}`}</code>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-medium mb-2">Workspace Management with v2 API:</p>
                                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto">
                                        <code className="text-sm whitespace-pre">{`// Load workspace and create collection
async function manageWorkspace() {
  try {
    // Load current workspace
    const workspace = await fetch('http://localhost:50051/collection/workspace');
    const data = await workspace.json();
    console.log('Current collections:', data.collections);

    // Create new collection
    const newCollection = await fetch('http://localhost:50051/collection/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'My API Tests',
        description: 'Collection for testing my API'
      })
    });
    
    const collection = await newCollection.json();
    console.log('Created collection:', collection);

    // Export workspace backup
    const backup = await fetch('http://localhost:50051/collection/workspace/export');
    const backupData = await backup.json();
    console.log('Workspace backup created');
    
  } catch (error) {
    console.error('Workspace error:', error);
  }
}`}</code>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Advanced Examples */}
                        <div>
                            <h4 className="font-medium text-lg mb-3">5. Advanced Usage</h4>
                            
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium mb-2 text-amber-600 dark:text-amber-400">Error Handling with Retry:</p>
                                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto">
                                        <code className="text-sm whitespace-pre">{`{
  "host": "grpcb.in:443",
  "method": "errorService.Error.Trigger",
  "message": {"code": "NOT_FOUND"},
  "timeout": 5000,
  "retry": {
    "maxAttempts": 3,
    "initialBackoff": 1000
  }
}`}</code>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-medium mb-2 text-green-600 dark:text-green-400">Working with Deadlines:</p>
                                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto">
                                        <code className="text-sm whitespace-pre">{`{
  "host": "grpcb.in:443",
  "method": "service.Method.Call",
  "message": {"key": "value"},
  "deadline": 30000  // 30 seconds
}`}</code>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-sm font-medium mb-2 text-purple-600 dark:text-purple-400">Server Streaming:</p>
                                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto">
                                        <code className="text-sm whitespace-pre">{`{
  "host": "grpcb.in:443",
  "method": "streamService.Stream.Numbers",
  "message": {"start": 1, "end": 10},
  "streaming": true
}`}</code>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Integration Ideas */}
                        <div>
                            <h4 className="font-medium text-lg mb-3">6. Integration Ideas</h4>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                    <div className="font-medium text-blue-800 dark:text-blue-200">CLI Tools</div>
                                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">Build command-line wrappers using curl or HTTP libraries</p>
                                </div>
                                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                    <div className="font-medium text-green-800 dark:text-green-200">CI/CD Pipelines</div>
                                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">Automate gRPC testing in deployment workflows</p>
                                </div>
                                <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                                    <div className="font-medium text-purple-800 dark:text-purple-200">Custom Frontends</div>
                                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">Build specialized interfaces for specific use cases</p>
                                </div>
                                <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                                    <div className="font-medium text-orange-800 dark:text-orange-200">Monitoring Tools</div>
                                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">Create health checks and service monitoring</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Authentication Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <HelpCircle className="h-5 w-5" />
                            Authentication & Security
                        </CardTitle>
                        <CardDescription>
                            How to handle authentication and secure connections
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-blue-600 dark:text-blue-400">
                                    Basic Authentication
                                </h4>
                                <p className="text-sm text-muted-foreground mb-2">Use the Metadata tab or in REST API:</p>
                                <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded-md">
                                    <code className="text-sm">
                                        "metaData": {"{"}"authorization": "Basic base64(username:password)"{"}"}
                                    </code>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-medium text-blue-600 dark:text-blue-400">
                                    Bearer Token
                                </h4>
                                <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded-md">
                                    <code className="text-sm">
                                        "metaData": {"{"}"authorization": "Bearer your-token-here"{"}"}
                                    </code>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-medium text-blue-600 dark:text-blue-400">
                                    Custom Headers
                                </h4>
                                <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded-md">
                                    <code className="text-sm">
                                        "metaData": {"{"}"x-api-key": "your-api-key", "custom-header": "value"{"}"}
                                    </code>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-medium text-green-600 dark:text-green-400">
                                    Privacy & Security
                                </h4>
                                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                                    <li>• All data stays local - no cloud data collection</li>
                                    <li>• Collections stored locally in ~/.grpc-client/</li>
                                    <li>• Enable TLS for secure server communication</li>
                                    <li>• Store sensitive metadata in collections with restricted permissions</li>
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Resources Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Book className="h-5 w-5" />
                            Additional Resources
                        </CardTitle>
                        <CardDescription>
                            Learn more about gRPC and this tool
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <Button 
                                variant="outline" 
                                className="justify-start h-auto p-4"
                                onClick={() => openExternalLink('https://grpc.io/docs/')}
                            >
                                <div className="flex items-center gap-3">
                                    <ExternalLink className="h-4 w-4" />
                                    <div className="text-left">
                                        <div className="font-medium">gRPC Documentation</div>
                                        <div className="text-sm text-muted-foreground">Official gRPC guides and references</div>
                                    </div>
                                </div>
                            </Button>
                            
                            <Button 
                                variant="outline" 
                                className="justify-start h-auto p-4"
                                onClick={() => openExternalLink('https://github.com/grpc/grpc/blob/master/doc/server-reflection.md')}
                            >
                                <div className="flex items-center gap-3">
                                    <ExternalLink className="h-4 w-4" />
                                    <div className="text-left">
                                        <div className="font-medium">Server Reflection</div>
                                        <div className="text-sm text-muted-foreground">Learn about gRPC reflection</div>
                                    </div>
                                </div>
                            </Button>
                            
                            <Button 
                                variant="outline" 
                                className="justify-start h-auto p-4"
                                onClick={() => openExternalLink('https://developers.google.com/protocol-buffers')}
                            >
                                <div className="flex items-center gap-3">
                                    <ExternalLink className="h-4 w-4" />
                                    <div className="text-left">
                                        <div className="font-medium">Protocol Buffers</div>
                                        <div className="text-sm text-muted-foreground">Google's data serialization format</div>
                                    </div>
                                </div>
                            </Button>
                            
                            <Button 
                                variant="outline" 
                                className="justify-start h-auto p-4"
                                onClick={() => openExternalLink('https://grpcb.in/')}
                            >
                                <div className="flex items-center gap-3">
                                    <ExternalLink className="h-4 w-4" />
                                    <div className="text-left">
                                        <div className="font-medium">Test gRPC Server</div>
                                        <div className="text-sm text-muted-foreground">Try grpcb.in:443 for testing</div>
                                    </div>
                                </div>
                            </Button>
                            
                            <Button 
                                variant="outline" 
                                className="justify-start h-auto p-4"
                                onClick={() => openExternalLink('https://github.com/bhagwati-web/grpc-client')}
                            >
                                <div className="flex items-center gap-3">
                                    <ExternalLink className="h-4 w-4" />
                                    <div className="text-left">
                                        <div className="font-medium">GitHub Repository</div>
                                        <div className="text-sm text-muted-foreground">Source code, issues, and releases</div>
                                    </div>
                                </div>
                            </Button>
                            
                            <Button 
                                variant="outline" 
                                className="justify-start h-auto p-4"
                                onClick={() => openExternalLink('https://github.com/bhagwati-web/grpc-client/releases')}
                            >
                                <div className="flex items-center gap-3">
                                    <ExternalLink className="h-4 w-4" />
                                    <div className="text-left">
                                        <div className="font-medium">Download Latest Release</div>
                                        <div className="text-sm text-muted-foreground">Get the latest binary for your platform</div>
                                    </div>
                                </div>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Back Button */}
                <Card>
                    <CardContent className="p-4">
                        <Button 
                            onClick={handleBackToHome}
                            className="w-full flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Home
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}