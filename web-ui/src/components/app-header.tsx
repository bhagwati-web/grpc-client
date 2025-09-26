import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { 
    // Heart, 
    GitBranchPlus 
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

interface AppHeaderProps {
    title: string;
    breadcrumbs?: { label: string; href?: string }[];
    showSidebar?: boolean;
}

export function AppHeader({ title, breadcrumbs = [], showSidebar = true }: AppHeaderProps) {
    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            {showSidebar && (
                <>
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                </>
            )}
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="/">
                            Application
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    {breadcrumbs.map((breadcrumb, index) => (
                        <>
                            <BreadcrumbItem key={index}>
                                {breadcrumb.href ? (
                                    <BreadcrumbLink href={breadcrumb.href}>
                                        {breadcrumb.label}
                                    </BreadcrumbLink>
                                ) : (
                                    <BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
                                )}
                            </BreadcrumbItem>
                            {index < breadcrumbs.length - 1 && (
                                <BreadcrumbSeparator className="hidden md:block" />
                            )}
                        </>
                    ))}
                    {breadcrumbs.length === 0 && (
                        <BreadcrumbItem>
                            <BreadcrumbPage>{title}</BreadcrumbPage>
                        </BreadcrumbItem>
                    )}
                </BreadcrumbList>
            </Breadcrumb>
            {/* Buy Me a Coffee Button */}
            <div className={`ml-auto ${showSidebar ? 'flex items-center gap-4' : ''}`}>
                <ThemeToggle />
                <a
                    href="https://github.com/bhagwati-web/homebrew-grpc-client"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Button
                        variant="outline"
                        size="sm"
                    >
                        <GitBranchPlus className="w-4 h-4" />
                        Github
                    </Button>
                </a>
                {/* <a
                    href="https://buymeacoffee.com/bhagwati1586"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700"
                    >
                        <Heart className="w-4 h-4 text-red-500" />
                        Buy me a coffee
                    </Button>
                </a> */}
            </div>
        </header>
    );
}
