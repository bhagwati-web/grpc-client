import { AppSidebar } from "@/components/app-sidebar"
import { AppHeader } from "@/components/app-header"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ReactNode } from "react"

interface LayoutProps {
    children: ReactNode;
    title: string;
    breadcrumbs?: { label: string; href?: string }[];
    showSidebar?: boolean;
}

export default function Layout({ children, title, breadcrumbs = [], showSidebar = true }: LayoutProps) {
    if (!showSidebar) {
        // Simple layout without sidebar
        return (
            <TooltipProvider>
                <div className="min-h-screen bg-background">
                    <AppHeader title={title} breadcrumbs={breadcrumbs} showSidebar={false} />
                    <main className="container mx-auto p-6">
                        {children}
                    </main>
                </div>
            </TooltipProvider>
        );
    }

    // Layout with sidebar (existing layout)
    return (
        <SidebarProvider>
            <TooltipProvider>
                <AppSidebar />
                <SidebarInset>
                    <AppHeader title={title} breadcrumbs={breadcrumbs} showSidebar={true} />
                    <div className="flex flex-1 flex-col gap-4">
                        <div className="flex flex-1 flex-col bg-zinc-100 md:min-h-min dark:bg-zinc-800/50 p-2 pl-4">
                            {children}
                        </div>
                    </div>
                </SidebarInset>
            </TooltipProvider>
        </SidebarProvider>
    )
}
