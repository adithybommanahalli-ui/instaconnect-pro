import { AppLayout } from "@/components/AppLayout";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Hash } from "lucide-react";
import { api, fileUrl } from "@/lib/api";

export default function Hashtag() {
  const { tag = "" } = useParams();
  const { data: posts = [] } = useQuery({
    queryKey: ["tag", tag],
    queryFn: async () => {
      const { posts } = await api<{ posts: any[] }>(`/api/posts/hashtag/${encodeURIComponent(tag.toLowerCase())}`);
      return posts;
    },
  });

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-primary rounded-2xl p-3 shadow-elegant"><Hash className="h-6 w-6 text-white" /></div>
          <div>
            <h1 className="text-3xl font-bold text-gradient" style={{ fontFamily: "Sora" }}>#{tag}</h1>
            <p className="text-muted-foreground text-sm">{posts.length} posts</p>
          </div>
        </div>
        {posts.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No posts with this hashtag yet</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1 md:gap-3">
            {posts.map((p: any) => (
              <Link key={p._id} to={`/u/${p.user?.username}`} className="aspect-square rounded-2xl overflow-hidden">
                <img src={fileUrl(p.image)} alt="" loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
