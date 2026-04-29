import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, Hash, AtSign } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api, fileUrl } from "@/lib/api";

export default function Search() {
  const [q, setQ] = useState("");
  const isTag = q.startsWith("#");
  const term = q.replace(/^#/, "").toLowerCase().trim();

  const { data: users = [] } = useQuery({
    queryKey: ["search-users", term],
    enabled: !isTag && term.length > 0,
    queryFn: async () => {
      const { users } = await api<{ users: any[] }>(`/api/users/search?q=${encodeURIComponent(term)}`);
      return users;
    },
  });

  const { data: tagPosts = [] } = useQuery({
    queryKey: ["search-tag", term],
    enabled: isTag && term.length > 0,
    queryFn: async () => {
      const { posts } = await api<{ posts: any[] }>(`/api/posts/hashtag/${encodeURIComponent(term)}`);
      return posts;
    },
  });

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gradient mb-4" style={{ fontFamily: "Sora" }}>Search</h1>
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users or #hashtags"
            className="pl-12 py-6 rounded-2xl glass border-border/50 text-base" />
        </div>

        <div className="mt-6">
          {!term && <p className="text-center text-muted-foreground py-12">Type a username or #tag to begin</p>}
          {!isTag && term && (
            <div className="space-y-2">
              {users.length === 0 && <p className="text-center text-muted-foreground py-8">No users found</p>}
              {users.map((u: any) => (
                <Link key={u._id} to={`/u/${u.username}`} className="flex items-center gap-4 glass rounded-2xl p-4 hover:bg-secondary/50 transition-colors">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={fileUrl(u.profilePhoto)} />
                    <AvatarFallback className="bg-gradient-primary text-white">{u.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold flex items-center gap-1"><AtSign className="h-3 w-3" />{u.username}</p>
                    {u.displayName && <p className="text-sm text-muted-foreground truncate">{u.displayName}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
          {isTag && term && (
            <div>
              <p className="text-sm text-muted-foreground mb-3 flex items-center gap-1"><Hash className="h-4 w-4" />{term} — {tagPosts.length} posts</p>
              <div className="grid grid-cols-3 gap-1 md:gap-3">
                {tagPosts.map((p: any) => (
                  <Link key={p._id} to={`/u/${p.user?.username}`} className="aspect-square rounded-xl overflow-hidden">
                    <img src={fileUrl(p.image)} alt="" loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
