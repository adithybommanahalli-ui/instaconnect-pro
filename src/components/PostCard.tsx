import { useState } from "react";
import { Heart, MessageCircle, Trash2, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export interface FeedPost {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  hashtags: string[];
  created_at: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
  likes: { user_id: string }[];
  comments: { id: string }[];
}

export const PostCard = ({ post }: { post: FeedPost }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const liked = post.likes.some((l) => l.user_id === user?.id);
  const likeCount = post.likes.length;
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [animating, setAnimating] = useState(false);
  const isOwn = user?.id === post.user_id;

  const toggleLike = async () => {
    if (!user) return;
    setAnimating(true); setTimeout(() => setAnimating(false), 400);
    if (liked) {
      await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      const { error } = await supabase.from("likes").insert({ post_id: post.id, user_id: user.id });
      if (!error && post.user_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: post.user_id, actor_id: user.id, type: "like", post_id: post.id,
        });
      }
    }
    qc.invalidateQueries({ queryKey: ["feed"] });
    qc.invalidateQueries({ queryKey: ["explore"] });
    qc.invalidateQueries({ queryKey: ["user-posts"] });
  };

  const remove = async () => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); qc.invalidateQueries(); }
  };

  return (
    <article className="glass-strong rounded-3xl overflow-hidden shadow-soft animate-fade-in">
      <header className="flex items-center gap-3 p-4">
        <Link to={`/u/${post.profiles?.username}`} className="gradient-ring">
          <Avatar className="h-10 w-10 border-2 border-background">
            <AvatarImage src={post.profiles?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-secondary">{post.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/u/${post.profiles?.username}`} className="font-semibold hover:text-primary transition-colors">
            @{post.profiles?.username}
          </Link>
          <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
        </div>
        {isOwn && (
          <Button size="icon" variant="ghost" onClick={remove} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </header>

      <div className="bg-black/20">
        <img src={post.image_url} alt={post.caption ?? "post"} className="w-full max-h-[600px] object-contain" loading="lazy" />
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={toggleLike} className={animating ? "animate-heart-pop" : ""}>
            <Heart className={`h-6 w-6 transition-colors ${liked ? "fill-destructive text-destructive" : ""}`} />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setShowComments((s) => !s)}>
            <MessageCircle className="h-6 w-6" />
          </Button>
        </div>
        <p className="text-sm font-semibold">{likeCount} {likeCount === 1 ? "like" : "likes"}</p>
        {post.caption && (
          <p className="text-sm">
            <Link to={`/u/${post.profiles?.username}`} className="font-semibold mr-2">@{post.profiles?.username}</Link>
            <CaptionWithTags text={post.caption} />
          </p>
        )}
        {post.comments.length > 0 && (
          <button onClick={() => setShowComments((s) => !s)} className="text-sm text-muted-foreground hover:text-foreground">
            View {post.comments.length} {post.comments.length === 1 ? "comment" : "comments"}
          </button>
        )}

        {showComments && <CommentsSection postId={post.id} postAuthorId={post.user_id} />}

        <div className="flex items-center gap-2 pt-2 border-t border-border/40">
          <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment…"
            className="border-0 bg-transparent focus-visible:ring-0 px-0"
            onKeyDown={async (e) => {
              if (e.key === "Enter" && commentText.trim() && user) {
                const text = commentText.trim().slice(0, 500);
                setCommentText("");
                const { error } = await supabase.from("comments").insert({ post_id: post.id, user_id: user.id, content: text });
                if (!error && post.user_id !== user.id) {
                  await supabase.from("notifications").insert({
                    user_id: post.user_id, actor_id: user.id, type: "comment", post_id: post.id,
                  });
                }
                qc.invalidateQueries();
              }
            }} />
          <Button size="icon" variant="ghost" disabled={!commentText.trim()}
            onClick={async () => {
              if (!user || !commentText.trim()) return;
              const text = commentText.trim().slice(0, 500);
              setCommentText("");
              const { error } = await supabase.from("comments").insert({ post_id: post.id, user_id: user.id, content: text });
              if (!error && post.user_id !== user.id) {
                await supabase.from("notifications").insert({
                  user_id: post.user_id, actor_id: user.id, type: "comment", post_id: post.id,
                });
              }
              qc.invalidateQueries();
            }}>
            <Send className="h-4 w-4 text-primary" />
          </Button>
        </div>
      </div>
    </article>
  );
};

const CaptionWithTags = ({ text }: { text: string }) => {
  const parts = text.split(/(#\w+)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("#") ? (
          <Link key={i} to={`/tag/${p.slice(1).toLowerCase()}`} className="text-primary hover:underline">{p}</Link>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
};

const CommentsSection = ({ postId, postAuthorId }: { postId: string; postAuthorId: string }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: comments = [] } = useQuery({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id,content,created_at,user_id, profiles:profiles!comments_user_id_fkey(username,avatar_url)")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-hide">
      {comments.map((c: any) => (
        <div key={c.id} className="flex items-start gap-2 group">
          <Avatar className="h-7 w-7"><AvatarImage src={c.profiles?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">{c.profiles?.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-sm">
            <Link to={`/u/${c.profiles?.username}`} className="font-semibold mr-2">@{c.profiles?.username}</Link>
            <span>{c.content}</span>
          </div>
          {(user?.id === c.user_id || user?.id === postAuthorId) && (
            <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 w-7"
              onClick={async () => { await supabase.from("comments").delete().eq("id", c.id); qc.invalidateQueries(); }}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
};
