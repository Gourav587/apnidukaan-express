import {
  LayoutDashboard, Package, ShoppingCart, Warehouse, Users, BarChart3, Settings, BookOpen, Truck, Receipt, Wallet, Tags, FileText
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Orders", url: "/admin/orders", icon: ShoppingCart },
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Categories", url: "/admin/categories", icon: Tags },
  { title: "Inventory", url: "/admin/inventory", icon: Warehouse },
  { title: "Customers", url: "/admin/customers", icon: Users },
];

const businessItems = [
  { title: "Wholesale", url: "/admin/wholesale", icon: BookOpen },
  { title: "Delivery", url: "/admin/delivery", icon: Truck },
  { title: "POS Records", url: "/admin/pos", icon: Receipt },
  { title: "Khata", url: "/admin/khata", icon: Wallet },
];

const insightItems = [
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

function NavGroup({ label, items }: { label: string; items: typeof mainItems }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/60">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-primary/10 text-primary font-medium">
                  <item.icon className="mr-2 h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm">
            A
          </div>
          {!collapsed && (
            <div>
              <p className="font-heading text-sm font-bold leading-none">ApniDukaan</p>
              <p className="text-[10px] text-muted-foreground">Admin Panel</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Main" items={mainItems} />
        <NavGroup label="Business" items={businessItems} />
        <NavGroup label="Insights" items={insightItems} />
      </SidebarContent>
    </Sidebar>
  );
}
