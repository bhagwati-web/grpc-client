"use client"

import {
  // HelpingHand,
  ChevronsUpDown,
  // GitBranchPlus,
  // LogOut,
  Sparkles,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()

  const handleSettingsClick = () => {
    window.location.href = '/settings';
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >

              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={handleSettingsClick}>
                <Sparkles />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {/* <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <a href="https://github.com/bhagwati-web/grpc-client" target="_blank" rel="noopener noreferrer">
                <DropdownMenuItem>
                  <GitBranchPlus />
                  Source code
                </DropdownMenuItem>
              </a>
            <a href="https://github.com/bhagwati-web/homebrew-grpc-client" target="_blank" rel="noopener noreferrer">
              <DropdownMenuItem>
                <LogOut />
                Homebrew Client
              </DropdownMenuItem>
            </a>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
              <a href="https://buymeacoffee.com/bhagwati1586" target="_blank" rel="noopener noreferrer">
                <DropdownMenuItem>
                  <HelpingHand />
                  Buy me a coffee
                </DropdownMenuItem>
              </a> */}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
