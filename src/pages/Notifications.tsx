import { AppLayout } from "@/components/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, UserPlus, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";

export default function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*, actor:profiles!notifications_actor_id_fkey(username,avatar_url), post:posts(id,image_url)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Mark all read on view
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(async () => {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id).is("read_at", null);
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }, 800);
    return () => clearTimeout(t);
  }, [user, qc]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("notif-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gradient mb-6" style={{ fontFamily: "Sora" }}>Notifications</h1>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : notifs.length === 0 ? (
          <div className="glass-strong rounded-3xl p-12 text-center text-muted-foreground">No notifications yet</div>
        ) : (
          <div className="space-y-2">
            {notifs.map((n: any) => (
              <div key={n.id} className={`glass rounded-2xl p-4 flex items-center gap-3 animate-fade-in ${!n.read_at ? "ring-1 ring-primary/40" : ""}`}>
                <Link to={`/u/${n.actor?.username}`}>
                  <Avatar className="h-10 w-10"><AvatarImage src={n.actor?.avatar_url ?? undefined} />
                    <AvatarFallback>{n.actor?.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 text-sm">
                  <Link to={`/u/${n.actor?.username}`} className="font-semibold hover:text-primary">@{n.actor?.username}</Link>{" "}
                  {n.type === "like" && <span>liked your post</span>}
                  {n.type === "comment" && <span>commented on your post</span>}
                  {n.type === "follow" && <span>started following you</span>}
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                </div>
                <Icon type={n.type} />
                {n.post?.image_url && <img src={n.post.image_url} className="h-12 w-12 rounded-lg object-cover" alt="" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

const Icon = ({ type }: { type: string }) => {
  if (type === "like") return <Heart className="h-5 w-5 text-destructive fill-destructive" />;
  if (type === "comment") return <MessageCircle className="h-5 w-5 text-accent" />;
  return <UserPlus className="h-5 w-5 text-primary" />;
};
