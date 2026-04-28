import { AppLayout } from "@/components/AppLayout";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, MessageCircle, Lock } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", username],
    enabled: !!username,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("username", username!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["user-posts", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("posts").select("id,image_url").eq("user_id", profile!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: counts } = useQuery({
    queryKey: ["counts", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const [{ count: followers }, { count: following }, { count: postCount }] = await Promise.all([
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile!.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile!.id),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", profile!.id),
      ]);
      return { followers: followers ?? 0, following: following ?? 0, posts: postCount ?? 0 };
    },
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["is-following", user?.id, profile?.id],
    enabled: !!user && !!profile && user.id !== profile.id,
    queryFn: async () => {
      const { data } = await supabase.from("follows").select("id").eq("follower_id", user!.id).eq("following_id", profile!.id).maybeSingle();
      return !!data;
    },
  });

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  if (!profile) return <AppLayout><div className="text-center py-20 text-muted-foreground">User not found</div></AppLayout>;

  const isOwn = user?.id === profile.id;

  const toggleFollow = async () => {
    if (!user) return;
    if (isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.id);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.id });
      await supabase.from("notifications").insert({ user_id: profile.id, actor_id: user.id, type: "follow" });
    }
    qc.invalidateQueries({ queryKey: ["is-following"] });
    qc.invalidateQueries({ queryKey: ["counts"] });
    qc.invalidateQueries({ queryKey: ["following-ids"] });
  };

  const startMessage = () => navigate(`/messages/${profile.id}`);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="glass-strong rounded-3xl p-6 md:p-8 animate-fade-in">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="gradient-ring">
              <Avatar className="h-28 w-28 md:h-36 md:w-36 border-4 border-background">
                <AvatarImage src={profile.avatar_url ?? undefined} />
                <AvatarFallback className="text-3xl bg-gradient-primary text-white">{profile.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: "Sora" }}>@{profile.username}</h1>
                {profile.is_private && <Lock className="h-4 w-4 text-muted-foreground" />}
                {isOwn ? (
                  <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}><Settings className="h-4 w-4 mr-1" /> Edit</Button>
                ) : (
                  <>
                    <Button size="sm" onClick={toggleFollow} className={isFollowing ? "" : "bg-gradient-primary hover:opacity-90"}>
                      {isFollowing ? "Following" : "Follow"}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={startMessage}><MessageCircle className="h-4 w-4 mr-1" /> Message</Button>
                  </>
                )}
              </div>
              {profile.display_name && <p className="font-semibold">{profile.display_name}</p>}
              {profile.bio && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>}
              <div className="flex justify-center md:justify-start gap-6 text-sm pt-2">
                <Stat label="posts" value={counts?.posts ?? 0} />
                <Stat label="followers" value={counts?.followers ?? 0} />
                <Stat label="following" value={counts?.following ?? 0} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {posts.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No posts yet</div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-3">
              {posts.map((p) => (
                <div key={p.id} className="aspect-square overflow-hidden rounded-xl md:rounded-2xl">
                  <img src={p.image_url} alt="" loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isOwn && <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} profile={profile} />}
    </AppLayout>
  );
}

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div><span className="font-bold mr-1">{value}</span><span className="text-muted-foreground">{label}</span></div>
);

const EditProfileDialog = ({ open, onOpenChange, profile }: any) => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [isPrivate, setIsPrivate] = useState(profile.is_private);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      let avatar_url = profile.avatar_url;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop() ?? "jpg";
        const path = `${profile.id}/${Date.now()}.${ext}`;
        const up = await supabase.storage.from("avatars").upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });
        if (up.error) throw up.error;
        avatar_url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      }
      const { error } = await supabase.from("profiles").update({
        display_name: displayName.slice(0, 60),
        bio: bio.slice(0, 280),
        is_private: isPrivate,
        avatar_url,
      }).eq("id", profile.id);
      if (error) throw error;
      toast.success("Profile updated");
      qc.invalidateQueries();
      onOpenChange(false);
      navigate(`/u/${profile.username}`);
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border/50">
        <DialogHeader><DialogTitle className="text-gradient text-2xl">Edit profile</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Avatar</Label>
            <Input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <Label>Display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={60} />
          </div>
          <div>
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={280} className="resize-none" />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="priv">Private account</Label>
            <Switch id="priv" checked={isPrivate} onCheckedChange={setIsPrivate} />
          </div>
          <Button onClick={save} disabled={saving} className="w-full bg-gradient-primary hover:opacity-90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
