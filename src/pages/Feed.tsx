import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { PostCard, FeedPost } from "@/components/PostCard";
import { AppLayout } from "@/components/AppLayout";
import { Loader2, Sparkles, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const PAGE_SIZE = 10;

export default function Feed() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [allPosts, setAllPosts] = useState<FeedPost[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const { data: followingIds = [] } = useQuery({
    queryKey: ["following-ids", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("follows").select("following_id").eq("follower_id", user!.id);
      if (error) throw error;
      return data.map((d) => d.following_id);
    },
  });

  const { data: posts, isLoading, isFetching } = useQuery({
    queryKey: ["feed", user?.id, page, followingIds.length],
    enabled: !!user,
    queryFn: async () => {
      const ids = [...followingIds, user!.id];
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles:profiles!posts_user_id_fkey(username,display_name,avatar_url), likes(user_id), comments(id)")
        .in("user_id", ids)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (error) throw error;
      return (data ?? []) as unknown as FeedPost[];
    },
  });

  useEffect(() => {
    if (!posts) return;
    if (page === 0) setAllPosts(posts);
    else setAllPosts((prev) => [...prev, ...posts.filter((p) => !prev.find((x) => x.id === p.id))]);
    setHasMore(posts.length === PAGE_SIZE);
  }, [posts, page]);

  // Reset on follow change
  useEffect(() => { setPage(0); }, [followingIds.length]);

  // Infinite scroll
  useEffect(() => {
    const onScroll = () => {
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 800 && hasMore && !isFetching) {
        setPage((p) => p + 1);
      }
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasMore, isFetching]);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-6 max-w-xl mx-auto w-full">
          <div className="md:hidden flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-gradient" style={{ fontFamily: "Sora" }}>GMinsta</h1>
          </div>

          {isLoading && page === 0 ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : allPosts.length === 0 ? (
            <EmptyFeed />
          ) : (
            allPosts.map((p) => <PostCard key={p.id} post={p} />)
          )}
          {isFetching && page > 0 && (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          )}
          {!hasMore && allPosts.length > 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">You're all caught up ✨</p>
          )}
        </div>

        <aside className="hidden lg:block sticky top-6 self-start">
          <Suggestions />
        </aside>
      </div>
    </AppLayout>
  );
}

const EmptyFeed = () => (
  <div className="glass-strong rounded-3xl p-12 text-center animate-fade-in">
    <Sparkles className="h-12 w-12 mx-auto text-primary mb-4" />
    <h2 className="text-xl font-bold mb-2">Your feed is quiet</h2>
    <p className="text-muted-foreground mb-4">Follow people to see their posts, or share your first moment.</p>
    <Link to="/explore"><Button className="bg-gradient-primary hover:opacity-90">Explore creators</Button></Link>
  </div>
);

const Suggestions = () => {
  const { user } = useAuth();
  const { data: suggestions = [] } = useQuery({
    queryKey: ["suggestions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", user!.id);
      const exclude = [user!.id, ...(follows?.map((f) => f.following_id) ?? [])];
      const { data } = await supabase.from("profiles").select("id,username,display_name,avatar_url")
        .not("id", "in", `(${exclude.join(",")})`).limit(5);
      return data ?? [];
    },
  });

  const follow = async (id: string) => {
    if (!user) return;
    await supabase.from("follows").insert({ follower_id: user.id, following_id: id });
    await supabase.from("notifications").insert({ user_id: id, actor_id: user.id, type: "follow" });
  };

  return (
    <div className="glass-strong rounded-3xl p-5 space-y-4">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Suggested for you</h3>
      {suggestions.length === 0 && <p className="text-sm text-muted-foreground">No suggestions right now</p>}
      {suggestions.map((s) => (
        <div key={s.id} className="flex items-center gap-3">
          <Link to={`/u/${s.username}`} className="gradient-ring">
            <Avatar className="h-10 w-10 border-2 border-background">
              <AvatarImage src={s.avatar_url ?? undefined} />
              <AvatarFallback>{s.username[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={`/u/${s.username}`} className="text-sm font-semibold truncate block hover:text-primary">@{s.username}</Link>
            <p className="text-xs text-muted-foreground truncate">{s.display_name}</p>
          </div>
          <Button size="sm" variant="ghost" className="text-primary hover:text-primary-glow" onClick={() => follow(s.id)}>
            <UserPlus className="h-4 w-4 mr-1" /> Follow
          </Button>
        </div>
      ))}
    </div>
  );
};
