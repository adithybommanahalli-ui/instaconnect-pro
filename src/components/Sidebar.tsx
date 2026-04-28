import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, PlusSquare, MessageCircle, Heart, User, LogOut, Compass } from "lucide-react";
import { Logo } from "./Logo";
import { Button } from "./ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface NavItem { to: string; icon: any; label: string; badge?: number }

export const Sidebar = ({ onCreate }: { onCreate: () => void }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);
  const [unreadMsg, setUnreadMsg] = useState(0);
  const [profile, setProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: p }, { count: n }, { count: m }] = await Promise.all([
        supabase.from("profiles").select("username,avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
        supabase.from("messages").select("*", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null),
      ]);
      if (p) setProfile(p as any);
      setUnread(n ?? 0);
      setUnreadMsg(m ?? 0);
    };
    load();
    const ch = supabase.channel("sidebar-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const items: NavItem[] = [
    { to: "/", icon: Home, label: "Feed" },
    { to: "/explore", icon: Compass, label: "Explore" },
    { to: "/search", icon: Search, label: "Search" },
    { to: "/messages", icon: MessageCircle, label: "Messages", badge: unreadMsg },
    { to: "/notifications", icon: Heart, label: "Notifications", badge: unread },
    { to: `/u/${profile?.username ?? ""}`, icon: User, label: "Profile" },
  ];

  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 flex-col h-screen sticky top-0 glass-strong border-r border-border/50 p-5 gap-2">
      <div className="px-2 py-3"><Logo /></div>

      <nav className="flex flex-col gap-1 mt-4">
        {items.map((it) => {
          const active = pathname === it.to || (it.to.startsWith("/u/") && pathname.startsWith("/u/"));
          return (
            <NavLink key={it.label} to={it.to}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative
                ${active ? "bg-gradient-primary text-primary-foreground shadow-elegant" : "hover:bg-secondary/60"}`}>
              <it.icon className={`h-5 w-5 ${active ? "" : "group-hover:scale-110 transition-transform"}`} />
              <span className="font-medium">{it.label}</span>
              {it.badge ? (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-semibold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                  {it.badge > 99 ? "99+" : it.badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}

        <Button onClick={onCreate} className="mt-2 bg-gradient-primary hover:opacity-90 text-primary-foreground rounded-xl py-6 shadow-elegant">
          <PlusSquare className="h-5 w-5 mr-2" /> Create Post
        </Button>
      </nav>

      <div className="mt-auto glass rounded-2xl p-3 flex items-center gap-3">
        <Avatar className="h-10 w-10 ring-2 ring-primary/40">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-gradient-primary text-primary-foreground">
            {profile?.username?.[0]?.toUpperCase() ?? "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">@{profile?.username}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <Button size="icon" variant="ghost" onClick={async () => { await signOut(); navigate("/auth"); }} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
};

export const MobileNav = ({ onCreate }: { onCreate: () => void }) => {
  const { pathname } = useLocation();
  const items = [
    { to: "/", icon: Home }, { to: "/search", icon: Search },
    { to: "#create", icon: PlusSquare, action: onCreate },
    { to: "/messages", icon: MessageCircle }, { to: "/notifications", icon: Heart },
  ];
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 glass-strong border-t border-border/50 px-2 py-2 flex justify-around">
      {items.map((it, i) => {
        const active = pathname === it.to;
        const Comp: any = it.action ? "button" : NavLink;
        return (
          <Comp key={i} to={it.to} onClick={it.action}
            className={`p-3 rounded-xl ${active ? "text-primary" : "text-foreground/70"}`}>
            <it.icon className="h-6 w-6" />
          </Comp>
        );
      })}
    </nav>
  );
};
