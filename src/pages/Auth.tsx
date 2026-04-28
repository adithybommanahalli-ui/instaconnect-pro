import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { Loader2, Mail, Lock, AtSign } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useEffect } from "react";

const signUpSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  username: z.string().trim().min(3, "Min 3 chars").max(20).regex(/^[a-z0-9_]+$/, "Lowercase letters, numbers, _ only"),
});
const signInSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(1, "Required").max(72),
});

export default function Auth() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [signIn, setSignIn] = useState({ email: "", password: "" });
  const [signUp, setSignUp] = useState({ email: "", password: "", username: "" });

  useEffect(() => { if (session) navigate("/", { replace: true }); }, [session, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse(signIn);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Welcome back!"); navigate("/", { replace: true }); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(signUp);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { username: parsed.data.username, display_name: parsed.data.username },
      },
    });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes("registered")) toast.error("Email already in use");
      else toast.error(error.message);
    } else { toast.success("Account created — welcome to GMinsta!"); navigate("/", { replace: true }); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Floating glow orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/30 blur-3xl animate-float" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent/30 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="w-full max-w-md glass-strong rounded-3xl p-8 shadow-elegant animate-scale-in relative z-10">
        <div className="flex justify-center mb-2"><Logo size="lg" /></div>
        <p className="text-center text-muted-foreground mb-8">Share moments. Beautifully.</p>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-secondary/50">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="si-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="si-email" type="email" placeholder="you@example.com" className="pl-10"
                    value={signIn.email} onChange={(e) => setSignIn({ ...signIn, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="si-pw">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="si-pw" type="password" placeholder="••••••••" className="pl-10"
                    value={signIn.password} onChange={(e) => setSignIn({ ...signIn, password: e.target.value })} />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-primary hover:opacity-90 py-6 rounded-xl shadow-elegant">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="su-user">Username</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="su-user" placeholder="yourname" className="pl-10"
                    value={signUp.username} onChange={(e) => setSignUp({ ...signUp, username: e.target.value.toLowerCase() })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="su-email" type="email" placeholder="you@example.com" className="pl-10"
                    value={signUp.email} onChange={(e) => setSignUp({ ...signUp, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-pw">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="su-pw" type="password" placeholder="At least 8 characters" className="pl-10"
                    value={signUp.password} onChange={(e) => setSignUp({ ...signUp, password: e.target.value })} />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-primary hover:opacity-90 py-6 rounded-xl shadow-elegant">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
