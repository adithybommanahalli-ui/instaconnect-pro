import { useState } from "react";
import { Heart, MessageCircle, Trash2, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Link } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { api, fileUrl } from "@/lib/api";

export interface PostUser {
  _id: string;
  username: string;
  displayName?: string;
  profilePhoto?: string;
}
export interface PostComment {
  _id: string;
  text: string;
  createdAt: string;
  user: PostUser | string;
}
export interface FeedPost {
  _id: string;
  user: PostUser;
  image: string;
  caption: string;
  hashtags: string[];
  likes: string[];
  comments: PostComment[];
  createdAt: string;
}

export const PostCard = ({ post: initial }: { post: FeedPost }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [post, setPost] = useState<FeedPost>(initial);
  const liked = !!user && post.likes.includes(user._id);
  const likeCount = post.likes.length;
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [animating, setAnimating] = useState(false);
  const isOwn = !!user && user._id === post.user._id;

  const toggleLike = async () => {
    if (!user) return;
    setAnimating(true); setTimeout(() => setAnimating(false), 400);
    // optimistic update
    setPost((p) => ({
      ...p,
      likes: liked ? p.likes.filter((id) => id !== user._id) : [...p.likes, user._id],
    }));
    try {
      await api(`/api/posts/${post._id}/like`, { method: "POST" });
    } catch (e: any) {
      toast.error(e.message);
      // revert
      setPost((p) => ({
        ...p,
        likes: liked ? [...p.likes, user._id] : p.likes.filter((id) => id !== user._id),
      }));
    }
  };

  const remove = async () => {
    if (!confirm("Delete this post?")) return;
    try {
      await api(`/api/posts/${post._id}`, { method: "DELETE" });
      toast.success("Deleted");
      qc.invalidateQueries();
    } catch (e: any) { toast.error(e.message); }
  };

  const submitComment = async () => {
    if (!user || !commentText.trim()) return;
    const text = commentText.trim().slice(0, 500);
    setCommentText("");
    try {
      const { comments } = await api<{ comments: PostComment[] }>(`/api/posts/${post._id}/comments`, {
        method: "POST", body: { text },
      });
      setPost((p) => ({ ...p, comments }));
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <article className="glass-strong rounded-3xl overflow-hidden shadow-soft animate-fade-in">
      <header className="flex items-center gap-3 p-4">
        <Link to={`/u/${post.user.username}`} className="gradient-ring">
          <Avatar className="h-10 w-10 border-2 border-background">
            <AvatarImage src={fileUrl(post.user.profilePhoto)} />
            <AvatarFallback className="bg-secondary">{post.user.username?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/u/${post.user.username}`} className="font-semibold hover:text-primary transition-colors">
            @{post.user.username}
          </Link>
          <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</p>
        </div>
        {isOwn && (
          <Button size="icon" variant="ghost" onClick={remove} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </header>

      <div className="bg-black/20">
        <img src={fileUrl(post.image)} alt={post.caption ?? "post"} className="w-full max-h-[600px] object-contain" loading="lazy" />
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
            <Link to={`/u/${post.user.username}`} className="font-semibold mr-2">@{post.user.username}</Link>
            <CaptionWithTags text={post.caption} />
          </p>
        )}
        {post.comments.length > 0 && (
          <button onClick={() => setShowComments((s) => !s)} className="text-sm text-muted-foreground hover:text-foreground">
            View {post.comments.length} {post.comments.length === 1 ? "comment" : "comments"}
          </button>
        )}

        {showComments && (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-hide">
            {post.comments.map((c) => {
              const cu = typeof c.user === "string" ? null : c.user;
              return (
                <div key={c._id} className="flex items-start gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={fileUrl(cu?.profilePhoto)} />
                    <AvatarFallback className="text-xs">{cu?.username?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-sm">
                    {cu ? (
                      <Link to={`/u/${cu.username}`} className="font-semibold mr-2">@{cu.username}</Link>
                    ) : null}
                    <span>{c.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-border/40">
          <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment…"
            className="border-0 bg-transparent focus-visible:ring-0 px-0"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitComment(); } }} />
          <Button size="icon" variant="ghost" disabled={!commentText.trim()} onClick={submitComment}>
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
