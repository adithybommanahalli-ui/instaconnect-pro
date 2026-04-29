import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { api, tokenStore } from "@/lib/api";
import { disconnectSocket, getSocket } from "@/lib/socket";

export interface AuthUser {
  _id: string;
  username: string;
  email: string;
  displayName?: string;
  bio?: string;
  profilePhoto?: string;
  isPrivate?: boolean;
  followers?: string[];
  following?: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { username: string; email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  refresh: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = tokenStore.get();
    if (!token) { setUser(null); setLoading(false); return; }
    try {
      const { user } = await api<{ user: AuthUser }>("/api/auth/me");
      setUser(user);
      getSocket(); // open the socket once we know we're logged in
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const signIn = async (email: string, password: string) => {
    const { token, user } = await api<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST", body: { email, password },
    });
    tokenStore.set(token);
    setUser(user);
    getSocket();
  };

  const signUp = async ({ username, email, password }: { username: string; email: string; password: string }) => {
    const { token, user } = await api<{ token: string; user: AuthUser }>("/api/auth/register", {
      method: "POST", body: { username, email, password, displayName: username },
    });
    tokenStore.set(token);
    setUser(user);
    getSocket();
  };

  const signOut = async () => {
    tokenStore.clear();
    disconnectSocket();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
