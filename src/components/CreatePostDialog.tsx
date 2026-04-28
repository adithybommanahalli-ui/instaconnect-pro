import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const CreatePostDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (b: boolean) => void }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setFile(null); setPreview(""); setCaption(""); };

  const onPick = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Please select an image"); return; }
    if (f.size > 8 * 1024 * 1024) { toast.error("Max 8MB"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!user || !file) { toast.error("Pick an image first"); return; }
    if (caption.length > 2000) { toast.error("Caption too long"); return; }
    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("post-images").upload(path, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { data: pub } = supabase.storage.from("post-images").getPublicUrl(path);
      const tags = Array.from(caption.matchAll(/#(\w+)/g)).map((m) => m[1].toLowerCase());
      const ins = await supabase.from("posts").insert({
        user_id: user.id, image_url: pub.publicUrl, caption, hashtags: tags,
      });
      if (ins.error) throw ins.error;
      toast.success("Post shared!");
      qc.invalidateQueries();
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to post");
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(b) => { if (!b) reset(); onOpenChange(b); }}>
      <DialogContent className="glass-strong border-border/50 max-w-lg">
        <DialogHeader><DialogTitle className="text-gradient text-2xl">Create new post</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {!preview ? (
            <label className="block border-2 border-dashed border-border/60 rounded-2xl p-12 text-center cursor-pointer hover:border-primary/60 transition-colors">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Click to upload an image</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 8MB</p>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
            </label>
          ) : (
            <div className="relative rounded-2xl overflow-hidden">
              <img src={preview} alt="preview" className="w-full h-80 object-cover" />
              <Button size="icon" variant="secondary" className="absolute top-2 right-2 rounded-full"
                onClick={() => { setFile(null); setPreview(""); }}><X className="h-4 w-4" /></Button>
            </div>
          )}
          <Textarea placeholder="Write a caption… use #hashtags to be discovered"
            value={caption} onChange={(e) => setCaption(e.target.value)} className="min-h-[100px] resize-none" maxLength={2000} />
          <Button onClick={submit} disabled={!file || submitting}
            className="w-full bg-gradient-primary hover:opacity-90 py-6 rounded-xl shadow-elegant">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Share Post"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
