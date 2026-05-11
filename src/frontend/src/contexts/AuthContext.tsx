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
  if (u.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL) {
    return { ...u, role: "systemAdmin", name: BOOTSTRAP_ADMIN_NAME };
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
        // Map backend error messages to friendly user-facing messages
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
      // Fetch the full user record from the backend using the userId in the session
      const session = result.ok;
      const allUsers = await actor.getUsers();
      const backendUser = allUsers.find((u) => u.id === session.userId);
      const pendingKey = `rktr_reg_${email.toLowerCase()}`;
      const pendingExtra = (() => {
        try {
          return JSON.parse(localStorage.getItem(pendingKey) ?? "{}") as {
            employeeNumber?: string;
            mobileNumber?: string;
          };
        } catch {
          return {};
        }
      })();
      const authUser: AuthUser = backendUser
        ? {
            id: backendUser.id,
            name: backendUser.name,
            email: backendUser.email,
            role: backendUser.role as AuthUser["role"],
            department: backendUser.department,
            employeeNumber: pendingExtra.employeeNumber,
            mobileNumber: pendingExtra.mobileNumber,
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
        return { success: false, error: result.err };
      }
      // Store enriched fields locally (backend schema doesn't carry these yet)
      const pendingKey = `rktr_reg_${email.trim().toLowerCase()}`;
      localStorage.setItem(
        pendingKey,
        JSON.stringify({
          employeeNumber: employeeNumber.trim(),
          mobileNumber: mobileNumber.trim(),
        }),
      );
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
