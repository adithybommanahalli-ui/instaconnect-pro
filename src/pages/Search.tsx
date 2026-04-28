import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search as SearchIcon, Hash, AtSign } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Search() {
  const [q, setQ] = useState("");
  const isTag = q.startsWith("#");
  const term = q.replace(/^#/, "").toLowerCase().trim();

  const { data: users = [] } = useQuery({
    queryKey: ["search-users", term],
    enabled: !isTag && term.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,username,display_name,avatar_url,bio")
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`).limit(20);
      return data ?? [];
    },
  });

  const { data: tagPosts = [] } = useQuery({
    queryKey: ["search-tag", term],
    enabled: isTag && term.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("posts").select("id,image_url,profiles:profiles!posts_user_id_fkey(username)")
        .contains("hashtags", [term]).order("created_at", { ascending: false }).limit(60);
      return data ?? [];
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
              {users.map((u) => (
                <Link key={u.id} to={`/u/${u.username}`} className="flex items-center gap-4 glass rounded-2xl p-4 hover:bg-secondary/50 transition-colors">
                  <Avatar className="h-12 w-12"><AvatarImage src={u.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-gradient-primary text-white">{u.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold flex items-center gap-1"><AtSign className="h-3 w-3" />{u.username}</p>
                    {u.display_name && <p className="text-sm text-muted-foreground truncate">{u.display_name}</p>}
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
                  <Link key={p.id} to={`/u/${p.profiles?.username}`} className="aspect-square rounded-xl overflow-hidden">
                    <img src={p.image_url} alt="" loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform" />
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
