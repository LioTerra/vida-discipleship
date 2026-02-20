import {
  Home,
  BookOpen,
  Users2,
  UserCog,
  Settings,
  Heart,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const allItems = [
  { title: "Início", url: "/app/inicio", icon: Home, roles: ["user", "staff", "admin"] },
  { title: "Ensino", url: "/app/ensino", icon: BookOpen, roles: ["user", "staff", "admin"] },
  { title: "Discipulado", url: "/app/discipulado", icon: Heart, roles: ["user", "staff", "admin"] },
  { title: "Meus Discípulos", url: "/app/meus-discipulos", icon: Users2, roles: ["staff", "admin"] },
  { title: "Usuários", url: "/app/usuarios", icon: UserCog, roles: ["admin"] },
  { title: "Configurações", url: "/app/configuracoes", icon: Settings, roles: ["admin"] },
];

export function AppSidebar() {
  const { profile } = useAuth();
  const role = profile?.role ?? "user";
  const items = allItems.filter((item) => item.roles.includes(role));

  return (
    <Sidebar collapsible="icon">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-primary">V</span>
          <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
            Ministério Vida
          </span>
        </div>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      activeClassName="bg-secondary text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
