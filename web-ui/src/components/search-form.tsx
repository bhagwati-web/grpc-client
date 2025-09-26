import React, { useContext, useRef } from "react"
import { Search } from "lucide-react"
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext"

import { Label } from "@/components/ui/label"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarInput,
} from "@/components/ui/sidebar"

export function SearchForm({ ...props }: React.ComponentProps<"form">) {
  const { collectionFilter, setCollectionFilter } = useContext(GrpcContext) as GrpcContextProps;
  const debounceRef = useRef<number | undefined>(undefined);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Clear previous timeout
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }
    
    // Debounce the search with 300ms delay
    debounceRef.current = window.setTimeout(() => {
      setCollectionFilter(value);
    }, 300);
  };

  return (
    <form {...props}>
      <SidebarGroup className="py-0">
        <SidebarGroupContent className="relative">
          <Label htmlFor="search" className="sr-only">
            Search
          </Label>
          <SidebarInput
            id="search"
            placeholder="Search the collection..."
            className="pl-8"
            defaultValue={collectionFilter || ""}
            onChange={handleInputChange}
          />
          <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 select-none opacity-50" />
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  )
}
