import { createActor } from "@/backend";
import { UserRole } from "@/backend";
import type { AuthUser } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { createContext, useContext, useEffect, useState } from "react";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    email: string,
    password: string,
    remember: boolean,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    name: string,
    email: string,
    password: string,
    department: string,
    employeeNumber: string,
    mobileNumber: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = "rktr_ohse_session";
const BOOTSTRAP_ADMIN_EMAIL = "sumesh.j@rktrwheels.com";
const BOOTSTRAP_ADMIN_NAME = "Sumesh J";

function enforceBootstrapAdmin(u: AuthUser): AuthUser {
  // Sumesh J is permanently System Admin — enforce it
  if (u.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL) {
    return { ...u, role: "systemAdmin", name: BOOTSTRAP_ADMIN_NAME };
  }
  // Any non-Sumesh user that somehow holds systemAdmin must be downgraded to employee
  if (u.role === "systemAdmin") {
    return { ...u, role: "employee" };
  }
  return u;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { actor } = useActor(createActor);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [seedDone, setSeedDone] = useState(false);

  useEffect(() => {
    const stored =
      localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const parsed = enforceBootstrapAdmin(JSON.parse(stored) as AuthUser);
        setUser(parsed);
      } catch {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (actor && !seedDone) {
      actor
        .seedMockData()
        .then(() => setSeedDone(true))
        .catch((err: unknown) => {
          console.warn("[AuthContext] seedMockData failed:", err);
          // Still mark done so login is not permanently blocked
          setSeedDone(true);
        });
    }
  }, [actor, seedDone]);

  const login = async (email: string, password: string, remember: boolean) => {
    if (!email.endsWith("@rktrwheels.com")) {
      return {
        success: false,
        error: "Access restricted to RKTR Wheels employees only.",
      };
    }
    if (!actor) {
      return {
        success: false,
        error: "Connection not ready. Please try again.",
      };
    }
    try {
      const result = await actor.login(email, password);
      if (result.__kind__ === "err") {
        const raw = result.err;
        if (
          raw.toLowerCase().includes("inactive") ||
          raw.toLowerCase().includes("not active") ||
          raw.toLowerCase().includes("pending")
        ) {
          return {
            success: false,
            error:
              "Your account is pending activation. Please contact your administrator.",
          };
        }
        if (
          raw.toLowerCase().includes("not found") ||
          raw.toLowerCase().includes("does not exist")
        ) {
          return {
            success: false,
            error: "No account found with this email address.",
          };
        }
        return { success: false, error: raw };
      }
      const session = result.ok;
      const allUsers = await actor.getUsers();
      const backendUser = allUsers.find((u) => u.id === session.userId);
      const authUser: AuthUser = backendUser
        ? {
            id: backendUser.id,
            name: backendUser.name,
            email: backendUser.email,
            role: backendUser.role as AuthUser["role"],
            department: backendUser.department,
            employeeNumber: backendUser.employeeNumber,
            mobileNumber: backendUser.mobileNumber,
          }
        : {
            id: session.userId,
            name: email
              .split("@")[0]
              .replace(/[._]/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase()),
            email,
            role: "employee",
            department: "General",
          };
      const finalUser = enforceBootstrapAdmin(authUser);
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(SESSION_KEY, JSON.stringify(finalUser));
      setUser(finalUser);
      return { success: true };
    } catch {
      return {
        success: false,
        error: "Login failed. Please check your credentials.",
      };
    }
  };

  const register = async (
    name: string,
    email: string,
    _password: string,
    department: string,
    employeeNumber: string,
    mobileNumber: string,
  ) => {
    if (!actor) {
      return {
        success: false,
        error: "Connection not ready. Please try again.",
      };
    }
    try {
      const userId = `u_${Date.now()}`;
      const result = await actor.createUser({
        id: userId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: UserRole.employee,
        department: department.trim() || "General",
        employeeNumber: employeeNumber.trim(),
        mobileNumber: mobileNumber.trim(),
        active: false,
      });
      if (result.__kind__ === "err") {
        const raw = result.err.toLowerCase();
        if (
          raw.includes("already") ||
          raw.includes("exists") ||
          raw.includes("taken") ||
          raw.includes("duplicate")
        ) {
          return {
            success: false,
            error:
              "Email already registered. Please sign in or use a different email.",
          };
        }
        return {
          success: false,
          error: "Registration failed. Please try again.",
        };
      }
      // Do NOT auto-login — account is pending activation
      return { success: true };
    } catch {
      return {
        success: false,
        error: "Registration failed. Please try again.",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
