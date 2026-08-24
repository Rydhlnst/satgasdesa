import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";

import { clearToken, getSession, login as apiLogin } from "./lib/api";
import type { Session } from "./types";
import type { Role } from "./theme";

type AuthContextValue = { session: Session | null; loading: boolean; refreshSession: () => Promise<void>; signIn: (email: string, password: string) => Promise<void>; signOut: () => Promise<void>; role: Role | null };
const AuthContext = createContext<AuthContextValue | null>(null);

function fallbackRoleFromPermissions(permissions: string[]): Role {
  if (permissions.includes("USER_READ")) return "PIMPINAN";
  if (permissions.includes("FINANCE_READ")) return "BENDAHARA";
  return "PETUGAS_LAPANGAN";
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getSession().then((value) => setSession({ ...value, role: value.role ?? fallbackRoleFromPermissions(value.permissions) })).catch(() => clearToken()).finally(() => setLoading(false)); }, []);
  const refreshSession = async () => {
    const value = await getSession();
    setSession({ ...value, role: value.role ?? fallbackRoleFromPermissions(value.permissions) });
  };
  const value = useMemo<AuthContextValue>(() => ({
    session, loading, role: session?.role ?? null,
    refreshSession,
    signIn: async (email, password) => { const value = await apiLogin(email, password); setSession({ ...value, role: value.role ?? fallbackRoleFromPermissions(value.permissions) }); },
    signOut: async () => { await clearToken(); setSession(null); },
  }), [loading, session]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
