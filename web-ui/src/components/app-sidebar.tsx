import * as React from "react"
import { Check, GalleryVerticalEnd, Minus, Plus } from "lucide-react"

import { SearchForm } from "@/components/search-form"
import { NavUser } from "@/components/nav-user"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { GrpcContext, GrpcContextProps } from "@/providers/GrpcContext"
import { appConfig } from "@/config/config"


export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const {
    setLoading,
    serverInfo,
    setServerInfo,
    version,
    setRefreshCollection,
    setCollection,
    filteredCollection
  } = React.useContext(GrpcContext) as GrpcContextProps;

  // This is sample data.
const data = {
  user: {
    name: "Settings",
    email: "Let's configure",
    avatar: "/avatars/shadcn.jpg",
  },
}
  const { method } = serverInfo;

  const fetchCollection = async () => {
    setLoading(true)
    const response = await fetch(`${appConfig.serviceBaseUrl + appConfig.collectionBaseUrl + appConfig.collectionLoadUrl}`)
    const data = await response.json()
    setCollection(data)
    setLoading(false)
  }

  React.useEffect(() => {
    fetchCollection()
    // Register the fetchCollection function with the context
    if (setRefreshCollection) {
      setRefreshCollection(() => fetchCollection)
    }
  }, [])

  const onItemClick = (item: any) => {
    const { message, host, service, requestName, metaData } = item
    setServerInfo({
      host,
      method: `${service}.${requestName}`,
      metaData: metaData || {},
      message: message || {}
    })
  }


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
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">GRPC Client</span>
                  <span className="">v{version}</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SearchForm />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {filteredCollection.map((service: any, serviceIndex: any) => (
              <Collapsible
                key={`${service?.title}-${service?.serviceName}-${serviceIndex}`}
                defaultOpen={serviceIndex === 0}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="py-2" size="lg">
                      <span className="font-bold">{service.title}{""}</span>
                      <Plus className="ml-auto group-data-[state=open]/collapsible:hidden" />
                      <Minus className="ml-auto group-data-[state=closed]/collapsible:hidden" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {service.items?.length ? (
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {service.items.map((serviceMethod: any, methodIndex: number) => (
                          <SidebarMenuSubItem key={`${service?.title}-${service?.serviceName}-${serviceIndex}-${serviceMethod.requestName}-${methodIndex}`}>
                            <SidebarMenuSubButton asChild
                              isActive={serviceMethod.service + "." + serviceMethod.requestName === method}
                              className="flex data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                            >
                              <a
                                onClick={() => onItemClick(serviceMethod)}
                                href="#!"
                                className="flex justify-between items-center"
                                style={{ textOverflow: 'unset', whiteSpace: 'normal', overflow: 'visible' }}
                              >
                                {serviceMethod.service + "." + serviceMethod.requestName === method && <span className="flex-col">
                                  <Check className="size-2" />
                                </span>}
                                <span className="flex-1 flex-col whitespace-normal break-words">{serviceMethod.requestName}</span>
                              </a>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  ) : null}
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
