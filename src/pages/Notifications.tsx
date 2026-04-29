import { AppLayout } from "@/components/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/providers/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, MessageCircle, UserPlus, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";
import { api, fileUrl } from "@/lib/api";

interface NotifItem {
  _id: string;
  type: "like" | "comment" | "follow";
  seen: boolean;
  createdAt: string;
  actor: { _id: string; username: string; profilePhoto?: string } | null;
  referenceId?: string | null;
}

export default function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ["notifications", user?._id],
    enabled: !!user,
    queryFn: async () => {
      const { notifications } = await api<{ notifications: NotifItem[] }>("/api/notifications");
      return notifications;
    },
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(async () => {
      try {
        await api("/api/notifications/seen", { method: "POST" });
        qc.invalidateQueries({ queryKey: ["notifications"] });
      } catch { /* ignore */ }
    }, 800);
    return () => clearTimeout(t);
  }, [user, qc, notifs.length]);

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
            {notifs.map((n) => (
              <div key={n._id} className={`glass rounded-2xl p-4 flex items-center gap-3 animate-fade-in ${!n.seen ? "ring-1 ring-primary/40" : ""}`}>
                {n.actor && (
                  <Link to={`/u/${n.actor.username}`}>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={fileUrl(n.actor.profilePhoto)} />
                      <AvatarFallback>{n.actor.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Link>
                )}
                <div className="flex-1 text-sm">
                  {n.actor && (
                    <Link to={`/u/${n.actor.username}`} className="font-semibold hover:text-primary">@{n.actor.username}</Link>
                  )}{" "}
                  {n.type === "like" && <span>liked your post</span>}
                  {n.type === "comment" && <span>commented on your post</span>}
                  {n.type === "follow" && <span>started following you</span>}
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                </div>
                <Icon type={n.type} />
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
