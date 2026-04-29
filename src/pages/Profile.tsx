import { AppLayout } from "@/components/AppLayout";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { api, fileUrl } from "@/lib/api";

interface ProfileUser {
  _id: string;
  username: string;
  displayName?: string;
  bio?: string;
  profilePhoto?: string;
  isPrivate?: boolean;
  followers: { _id: string }[];
  following: { _id: string }[];
}

export default function Profile() {
  const { username } = useParams();
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", username],
    enabled: !!username,
    queryFn: async () => {
      const { user } = await api<{ user: ProfileUser }>(`/api/users/${encodeURIComponent(username!)}`);
      return user;
    },
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["user-posts", profile?._id],
    enabled: !!profile?._id,
    queryFn: async () => {
      const { posts } = await api<{ posts: any[] }>(`/api/posts/user/${encodeURIComponent(profile!.username)}`);
      return posts;
    },
  });

  if (isLoading) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></AppLayout>;
  if (!profile) return <AppLayout><div className="text-center py-20 text-muted-foreground">User not found</div></AppLayout>;

  const isOwn = user?._id === profile._id;
  const isFollowing = !!user && profile.followers.some((f) => f._id === user._id);
  const counts = {
    followers: profile.followers.length,
    following: profile.following.length,
    posts: posts.length,
  };

  const toggleFollow = async () => {
    if (!user) return;
    try {
      if (isFollowing) {
        await api(`/api/users/${profile._id}/follow`, { method: "DELETE" });
      } else {
        await api(`/api/users/${profile._id}/follow`, { method: "POST" });
      }
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const startMessage = () => navigate(`/messages/${profile._id}`);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="glass-strong rounded-3xl p-6 md:p-8 animate-fade-in">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="gradient-ring">
              <Avatar className="h-28 w-28 md:h-36 md:w-36 border-4 border-background">
                <AvatarImage src={fileUrl(profile.profilePhoto)} />
                <AvatarFallback className="text-3xl bg-gradient-primary text-white">{profile.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 text-center md:text-left space-y-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: "Sora" }}>@{profile.username}</h1>
                {profile.isPrivate && <Lock className="h-4 w-4 text-muted-foreground" />}
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
              {profile.displayName && <p className="font-semibold">{profile.displayName}</p>}
              {profile.bio && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.bio}</p>}
              <div className="flex justify-center md:justify-start gap-6 text-sm pt-2">
                <Stat label="posts" value={counts.posts} />
                <Stat label="followers" value={counts.followers} />
                <Stat label="following" value={counts.following} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {posts.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">No posts yet</div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-3">
              {posts.map((p: any) => (
                <div key={p._id} className="aspect-square overflow-hidden rounded-xl md:rounded-2xl">
                  <img src={fileUrl(p.image)} alt="" loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isOwn && <EditProfileDialog open={editOpen} onOpenChange={setEditOpen} profile={profile} onSaved={() => { refresh(); qc.invalidateQueries(); }} />}
    </AppLayout>
  );
}

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div><span className="font-bold mr-1">{value}</span><span className="text-muted-foreground">{label}</span></div>
);

interface EditDialogProps {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  profile: ProfileUser;
  onSaved: () => void;
}

const EditProfileDialog = ({ open, onOpenChange, profile, onSaved }: EditDialogProps) => {
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [isPrivate, setIsPrivate] = useState(!!profile.isPrivate);
  const [profilePhoto, setProfilePhoto] = useState(profile.profilePhoto ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api("/api/users", {
        method: "PUT",
        body: {
          displayName: displayName.slice(0, 60),
          bio: bio.slice(0, 280),
          isPrivate,
          profilePhoto,
        },
      });
      toast.success("Profile updated");
      onSaved();
      onOpenChange(false);
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-border/50">
        <DialogHeader><DialogTitle className="text-gradient text-2xl">Edit profile</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Avatar URL</Label>
            <Input value={profilePhoto} onChange={(e) => setProfilePhoto(e.target.value)} placeholder="https://… or /uploads/…" />
            <p className="text-xs text-muted-foreground mt-1">Paste any image URL.</p>
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
