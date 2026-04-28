import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Check, CheckCheck, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  other_id: string;
  username: string;
  avatar_url: string | null;
  last_content: string;
  last_at: string;
  unread: number;
}

export default function Messages() {
  const { user } = useAuth();
  const { otherId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: msgs, error } = await supabase
        .from("messages")
        .select("id,sender_id,recipient_id,content,read_at,created_at")
        .or(`sender_id.eq.${user!.id},recipient_id.eq.${user!.id}`)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const map = new Map<string, Conversation>();
      for (const m of msgs ?? []) {
        const other = m.sender_id === user!.id ? m.recipient_id : m.sender_id;
        if (!map.has(other)) {
          map.set(other, {
            other_id: other, username: "", avatar_url: null,
            last_content: m.content, last_at: m.created_at, unread: 0,
          });
        }
        const c = map.get(other)!;
        if (m.recipient_id === user!.id && !m.read_at) c.unread++;
      }
      const ids = [...map.keys()];
      if (ids.length === 0) return [];
      const { data: profs } = await supabase.from("profiles").select("id,username,avatar_url").in("id", ids);
      for (const p of profs ?? []) {
        const c = map.get(p.id);
        if (c) { c.username = p.username; c.avatar_url = p.avatar_url; }
      }
      return [...map.values()].sort((a, b) => b.last_at.localeCompare(a.last_at));
    },
  });

  // Realtime conversations refresh
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("conv-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto h-[calc(100vh-2rem)] md:h-screen p-2 md:p-4">
        <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-full">
          <div className={`glass-strong rounded-3xl p-3 overflow-y-auto ${otherId ? "hidden md:block" : ""}`}>
            <h2 className="text-xl font-bold p-3" style={{ fontFamily: "Sora" }}>Messages</h2>
            {conversations.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No conversations yet. Start one from a profile.</p>
            )}
            {conversations.map((c) => (
              <button key={c.other_id} onClick={() => navigate(`/messages/${c.other_id}`)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/50 transition-colors text-left ${otherId === c.other_id ? "bg-secondary/70" : ""}`}>
                <Avatar><AvatarImage src={c.avatar_url ?? undefined} />
                  <AvatarFallback>{c.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">@{c.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.last_content}</p>
                </div>
                {c.unread > 0 && <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 font-semibold">{c.unread}</span>}
              </button>
            ))}
          </div>

          <div className={`glass-strong rounded-3xl flex flex-col overflow-hidden ${!otherId ? "hidden md:flex" : "flex"}`}>
            {otherId ? <ChatPane otherId={otherId} onBack={() => navigate("/messages")} /> : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center">
                Select a conversation
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

const ChatPane = ({ otherId, onBack }: { otherId: string; onBack: () => void }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: other } = useQuery({
    queryKey: ["profile-by-id", otherId],
    queryFn: async () => (await supabase.from("profiles").select("id,username,avatar_url").eq("id", otherId).maybeSingle()).data,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["thread", user?.id, otherId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user!.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user!.id})`)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  // Mark received as read
  useEffect(() => {
    if (!user) return;
    const unreadIds = messages.filter((m: any) => m.recipient_id === user.id && !m.read_at).map((m: any) => m.id);
    if (unreadIds.length > 0) {
      supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds).then(() => {
        qc.invalidateQueries({ queryKey: ["conversations"] });
      });
    }
  }, [messages, user, qc]);

  // Realtime thread
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`thread-${otherId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        const m: any = payload.new ?? payload.old;
        if (!m) return;
        const involved = (m.sender_id === user.id && m.recipient_id === otherId) ||
                         (m.sender_id === otherId && m.recipient_id === user.id);
        if (involved) qc.invalidateQueries({ queryKey: ["thread", user.id, otherId] });
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, otherId, qc]);

  const send = async () => {
    if (!user || !text.trim()) return;
    setSending(true);
    const content = text.trim().slice(0, 2000);
    setText("");
    const { error } = await supabase.from("messages").insert({ sender_id: user.id, recipient_id: otherId, content });
    setSending(false);
    if (error) console.error(error);
  };

  return (
    <>
      <div className="flex items-center gap-3 p-4 border-b border-border/40">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <Avatar><AvatarImage src={other?.avatar_url ?? undefined} /><AvatarFallback>{other?.username?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
        <div><p className="font-semibold">@{other?.username}</p></div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && <p className="text-center text-muted-foreground py-12 text-sm">Send the first message ✨</p>}
        {messages.map((m: any) => {
          const own = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"} animate-fade-in`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${own ? "bg-gradient-primary text-primary-foreground rounded-br-sm" : "glass rounded-bl-sm"}`}>
                <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                <div className={`text-[10px] mt-1 flex items-center gap-1 ${own ? "text-primary-foreground/80 justify-end" : "text-muted-foreground"}`}>
                  {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                  {own && (m.read_at ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <div className="p-3 border-t border-border/40 flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          className="rounded-xl bg-secondary/50 border-0" />
        <Button onClick={send} disabled={!text.trim() || sending} className="bg-gradient-primary hover:opacity-90 rounded-xl">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );
};
