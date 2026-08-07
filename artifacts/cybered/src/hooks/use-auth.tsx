import { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, setAuthTokenGetter, setOnUnauthorized, refreshSession } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";

// Register a global token getter so every API call gets Authorization: Bearer <token>
setAuthTokenGetter(() => localStorage.getItem("token"));

setOnUnauthorized(async () => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("auth-changed"));
    return;
  }
  try {
    const res = await refreshSession({ refreshToken });
    localStorage.setItem("token", res.token);
    localStorage.setItem("refreshToken", res.refreshToken);
  } catch (err) {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    window.dispatchEvent(new Event("auth-changed"));
  }
});

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, refreshToken: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  
  const { data: user, isLoading: isFetchingUser, refetch } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    } as any
  });

  const isLoading = !!token && isFetchingUser;

  useEffect(() => {
    const handleAuthChange = () => {
      setToken(localStorage.getItem("token"));
    };
    window.addEventListener("auth-changed", handleAuthChange);
    return () => window.removeEventListener("auth-changed", handleAuthChange);
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  const login = (newToken: string, newRefreshToken: string) => {
    localStorage.setItem("refreshToken", newRefreshToken);
    setToken(newToken);
    setTimeout(() => refetch(), 0);
  };

  const logout = () => {
    localStorage.removeItem("refreshToken");
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
