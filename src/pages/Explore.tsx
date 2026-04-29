import { AppLayout } from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { Heart, MessageCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api, fileUrl } from "@/lib/api";

interface ExplorePost {
  _id: string;
  image: string;
  caption: string;
  user: { username: string };
  likes: string[];
  comments: any[];
}

export default function Explore() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["explore"],
    queryFn: async () => {
      const { posts } = await api<{ posts: ExplorePost[] }>("/api/posts/explore");
      return posts;
    },
  });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gradient mb-6" style={{ fontFamily: "Sora" }}>Explore</h1>
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : posts.length === 0 ? (
          <div className="glass-strong rounded-3xl p-12 text-center text-muted-foreground">No posts yet — be the first to share!</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            {posts.map((p) => (
              <Link key={p._id} to={`/u/${p.user?.username}`} className="relative aspect-square overflow-hidden rounded-2xl group">
                <img src={fileUrl(p.image)} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-6 text-white opacity-0 group-hover:opacity-100">
                  <span className="flex items-center gap-1 font-semibold"><Heart className="h-5 w-5 fill-white" /> {p.likes?.length ?? 0}</span>
                  <span className="flex items-center gap-1 font-semibold"><MessageCircle className="h-5 w-5 fill-white" /> {p.comments?.length ?? 0}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
