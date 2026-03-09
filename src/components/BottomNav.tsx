import { Home, BookOpen, Heart, Users2, UserCog, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";

const bottomNavItems: Record<string, { title: string; url: string; icon: typeof Home }[]> = {
  user: [
    { title: "Início", url: "/app/inicio", icon: Home },
    { title: "Ensino", url: "/app/ensino", icon: BookOpen },
    { title: "Discipulado", url: "/app/discipulado", icon: Heart },
  ],
  staff: [
    { title: "Início", url: "/app/inicio", icon: Home },
    { title: "Ensino", url: "/app/ensino", icon: BookOpen },
    { title: "Discipulado", url: "/app/discipulado", icon: Heart },
    { title: "Discípulos", url: "/app/meus-discipulos", icon: Users2 },
  ],
  admin: [
    { title: "Início", url: "/app/inicio", icon: Home },
    { title: "Ensino", url: "/app/ensino", icon: BookOpen },
    { title: "Usuários", url: "/app/usuarios", icon: UserCog },
    { title: "Config", url: "/app/configuracoes", icon: Settings },
  ],
};

export function BottomNav() {
  const { profile } = useAuth();
  const role = profile?.role ?? "user";
  const items = bottomNavItems[role] ?? bottomNavItems.user;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-[#0a0a0a] md:hidden">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            className="flex flex-col items-center gap-1 px-2 py-1.5 text-muted-foreground transition-colors min-w-0 flex-1"
            activeClassName="text-primary"
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span className="text-[10px] leading-tight truncate">{item.title}</span>
          </NavLink>
        ))}
      </div>
      {/* Safe area for devices with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
