import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/providers/AuthProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Check, CheckCheck, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api, fileUrl } from "@/lib/api";
import { getSocket } from "@/lib/socket";

interface Conversation {
  otherId: string;
  username: string;
  displayName?: string;
  profilePhoto?: string;
  lastContent: string;
  lastAt: string;
  unread: number;
}

interface Message {
  _id: string;
  sender: string;
  receiver: string;
  content: string;
  status: "sent" | "delivered" | "read";
  createdAt: string;
}

export default function Messages() {
  const { user } = useAuth();
  const { otherId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations", user?._id],
    enabled: !!user,
    queryFn: async () => {
      const { conversations } = await api<{ conversations: Conversation[] }>("/api/messages");
      return conversations;
    },
    refetchInterval: 15000,
  });

  // Refresh conversation list on any incoming message
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => qc.invalidateQueries({ queryKey: ["conversations"] });
    socket.on("message:new", refresh);
    socket.on("message:read", refresh);
    return () => {
      socket.off("message:new", refresh);
      socket.off("message:read", refresh);
    };
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
              <button key={c.otherId} onClick={() => navigate(`/messages/${c.otherId}`)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/50 transition-colors text-left ${otherId === c.otherId ? "bg-secondary/70" : ""}`}>
                <Avatar><AvatarImage src={fileUrl(c.profilePhoto)} />
                  <AvatarFallback>{c.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">@{c.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.lastContent}</p>
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
  const [messages, setMessages] = useState<Message[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const { data: other } = useQuery({
    queryKey: ["profile-by-id", otherId],
    queryFn: async () => {
      const { user } = await api<{ user: any }>(`/api/users/id/${otherId}`);
      return user;
    },
  });

  const { data: initialMessages } = useQuery({
    queryKey: ["thread", user?._id, otherId],
    enabled: !!user,
    queryFn: async () => {
      const { messages } = await api<{ messages: Message[] }>(`/api/messages/${otherId}`);
      return messages;
    },
  });

  useEffect(() => { if (initialMessages) setMessages(initialMessages); }, [initialMessages]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  // Tell the server we've read this thread
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit("message:read", { from: otherId });
    qc.invalidateQueries({ queryKey: ["conversations"] });
  }, [user, otherId, qc, messages.length]);

  // Live updates
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;
    const onNew = (m: Message) => {
      const involved =
        (m.sender === user._id && m.receiver === otherId) ||
        (m.sender === otherId && m.receiver === user._id);
      if (involved) setMessages((prev) => prev.find((x) => x._id === m._id) ? prev : [...prev, m]);
    };
    const onRead = ({ by }: { by: string }) => {
      if (by !== otherId) return;
      setMessages((prev) => prev.map((m) => (m.sender === user._id ? { ...m, status: "read" } : m)));
    };
    socket.on("message:new", onNew);
    socket.on("message:sent", onNew);
    socket.on("message:read", onRead);
    return () => {
      socket.off("message:new", onNew);
      socket.off("message:sent", onNew);
      socket.off("message:read", onRead);
    };
  }, [user, otherId]);

  const send = async () => {
    if (!user || !text.trim()) return;
    setSending(true);
    const content = text.trim().slice(0, 2000);
    setText("");
    try {
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("message:send", { receiver: otherId, content }, (ack: any) => {
          if (ack?.ok && ack.message) {
            setMessages((prev) => prev.find((x) => x._id === ack.message._id) ? prev : [...prev, ack.message]);
          }
        });
      } else {
        const { message } = await api<{ message: Message }>("/api/messages", {
          method: "POST", body: { receiver: otherId, content },
        });
        setMessages((prev) => [...prev, message]);
      }
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  return (
    <>
      <div className="flex items-center gap-3 p-4 border-b border-border/40">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <Avatar><AvatarImage src={fileUrl(other?.profilePhoto)} /><AvatarFallback>{other?.username?.[0]?.toUpperCase()}</AvatarFallback></Avatar>
        <div><p className="font-semibold">@{other?.username}</p></div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && <p className="text-center text-muted-foreground py-12 text-sm">Send the first message ✨</p>}
        {messages.map((m) => {
          const own = m.sender === user?._id;
          return (
            <div key={m._id} className={`flex ${own ? "justify-end" : "justify-start"} animate-fade-in`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${own ? "bg-gradient-primary text-primary-foreground rounded-br-sm" : "glass rounded-bl-sm"}`}>
                <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                <div className={`text-[10px] mt-1 flex items-center gap-1 ${own ? "text-primary-foreground/80 justify-end" : "text-muted-foreground"}`}>
                  {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                  {own && (m.status === "read" ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
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
