import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
let fetch: any;

(async () => {
    fetch = (await import('node-fetch')).default;
})(); // Install this dependency: `npm install node-fetch`

let jarProcess: any;

export function activate(context: vscode.ExtensionContext) {
    const grpcurlPath = '/opt/homebrew/bin'; // Update with the actual path where grpcurl is installed
    const extensionPath = context.extensionPath; // Get the path to the extension directory
    const jarPath = path.resolve(extensionPath, 'assets', 'grpc-rest-client-0.0.1.jar'); // Resolve the path to the JAR file in the assets folder
    const endpointUrl = 'http://localhost:50051'; // URL of the GRPC client
    const env = { ...process.env, PATH: `${process.env.PATH}:${grpcurlPath}` };

    // Create the status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = 'Start GRPC';
    statusBarItem.tooltip = 'Click to start the GRPC Client';
    statusBarItem.command = 'extension.toggleGrpcClient';
    statusBarItem.show();

    // Command to toggle the GRPC client
    const toggleGrpcCommand = vscode.commands.registerCommand('extension.toggleGrpcClient', async () => {
        if (jarProcess) {
            stopGrpcClient(statusBarItem);
        } else {
            await startGrpcClient(statusBarItem, jarPath, env, endpointUrl);
        }
    });

    context.subscriptions.push(toggleGrpcCommand, statusBarItem);
}

// Function to start the GRPC client
async function startGrpcClient(statusBarItem: vscode.StatusBarItem, jarPath: string, env: any, endpointUrl: string) {
    const isRunning = await checkIfEndpointRunning(endpointUrl);
    if (isRunning) {
        vscode.window.showInformationMessage('GRPC client is already running. Opening the client view...');
        openWebview(endpointUrl);
        return;
    }

    vscode.window.showInformationMessage('Starting the GRPC client...');
    jarProcess = spawn('java', ['-jar', jarPath], { detached: true, env });

    jarProcess.stdout.on('data', (data: any) => {
        console.log(`JAR Output: ${data}`);
    });

    jarProcess.stderr.on('data', (data: any) => {
        console.error(`JAR Error: ${data}`);
    });

    jarProcess.on('close', (code: any) => {
        vscode.window.showWarningMessage(`JAR exited with code ${code}`);
        jarProcess = null;
        statusBarItem.text = 'Start GRPC';
        statusBarItem.tooltip = 'Click to start the GRPC client';
    });

    vscode.window.showInformationMessage('Waiting for GRPC client to be ready...');
    await waitForEndpoint(endpointUrl);
    vscode.window.showInformationMessage('GRPC client is ready. Opening the client view...');
    statusBarItem.text = 'Stop GRPC';
    statusBarItem.tooltip = 'Click to stop the GRPC client';
    openWebview(endpointUrl);
}

// Function to stop the GRPC client
function stopGrpcClient(statusBarItem: vscode.StatusBarItem) {
    if (jarProcess) {
        jarProcess.kill();
        jarProcess = null;
        vscode.window.showInformationMessage('GRPC client stopped.');
    }
    statusBarItem.text = 'Start GRPC';
    statusBarItem.tooltip = 'Click to start the GRPC client';
}

// Function to check if the endpoint is already running
async function checkIfEndpointRunning(url: string): Promise<boolean> {
    try {
        const response = await fetch(url);
        return response.ok;
    } catch {
        return false;
    }
}

// Function to open the webview
function openWebview(endpointUrl: string) {
    const panel = vscode.window.createWebviewPanel(
        'exampleWebview', // Identifies the type of the webview
        'GRPC Client', // Title of the webview
        vscode.ViewColumn.One, // View column to show the webview in
        {
            enableScripts: true, // Enable JavaScript in the webview
            retainContextWhenHidden: true, // Retain context when webview is hidden
        }
    );

    // Set the HTML content for the webview
    panel.webview.html = getWebviewContent(endpointUrl);
}

// Helper function to wait for the endpoint to be ready
async function waitForEndpoint(url: string, timeout: number = 30000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        try {
            const response = await fetch(url);
            if (response.ok) return;
        } catch {
            // Ignore errors, retry
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error('Endpoint not ready in time');
}

// Function to return the HTML content with the URL
// Function to return the HTML content with the URL
function getWebviewContent(endpointUrl: string): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GRPC Client</title>
        <style>
            html, body, iframe {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                border: none;
                overflow: hidden;
            }
        </style>
        <meta
            http-equiv="Content-Security-Policy"
            content="default-src 'none'; frame-src ${endpointUrl}; script-src 'unsafe-inline'; style-src 'unsafe-inline';"
        >
    </head>
    <body>
        <iframe 
            src="${endpointUrl}" 
            allow="clipboard-read; clipboard-write" 
            style="width: 100%; height: 100%; border: none;">
        </iframe>
    </body>
    </html>`;
}


export function deactivate() {
    if (jarProcess) {
        jarProcess.kill();
        jarProcess = null;
    }
}
