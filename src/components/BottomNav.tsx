import { Home, BookOpen, Heart, Users2, UserCog, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { usePendingUsers } from "@/hooks/usePendingUsers";

const bottomNavItems: Record<string, { title: string; url: string; icon: typeof Home; badgeKey?: string }[]> = {
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
    { title: "Discipulado", url: "/app/discipulado", icon: Heart },
    { title: "Discípulos", url: "/app/meus-discipulos", icon: Users2 },
    { title: "Usuários", url: "/app/usuarios", icon: UserCog, badgeKey: "pending" },
  ],
};

export function BottomNav() {
  const { profile } = useAuth();
  const role = profile?.role ?? "user";
  const items = bottomNavItems[role] ?? bottomNavItems.user;
  const pendingCount = usePendingUsers();

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
            <div className="relative">
              <item.icon className="h-5 w-5 shrink-0" />
              {item.badgeKey && pendingCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-0.5">
                  {pendingCount > 9 ? "9+" : pendingCount}
                </span>
              )}
            </div>
            <span className="text-[10px] leading-tight truncate">{item.title}</span>
          </NavLink>
        ))}
      </div>
      {/* Safe area for devices with home indicator */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
