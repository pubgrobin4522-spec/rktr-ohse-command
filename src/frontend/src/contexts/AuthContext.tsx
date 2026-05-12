import { createActor } from "@/backend";
import { UserRole } from "@/backend";
import type { AuthUser } from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (
    employeeNumber: string,
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
const BOOTSTRAP_ADMIN_EMP = "230034";
const BOOTSTRAP_ADMIN_PASSWORD = "D3IK-IBY8@janu";
const BOOTSTRAP_ADMIN_NAME = "Sumesh J";

function enforceBootstrapAdmin(u: AuthUser): AuthUser {
  // Sumesh J (employee #230034) is permanently System Admin — enforce it
  if (u.employeeNumber === BOOTSTRAP_ADMIN_EMP) {
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

  // Keep a stable ref to the actor so the principal registration
  // callback can access the latest actor without being re-created
  const actorRef = useRef(actor);
  useEffect(() => {
    actorRef.current = actor;
  }, [actor]);

  /**
   * Bind the caller's IC principal to their employee number.
   * Fire-and-forget — never blocks login; silently ignored if canister is unavailable.
   */
  const registerPrincipal = useCallback((employeeNumber: string) => {
    const a = actorRef.current;
    if (!a) return;
    a.registerCallerPrincipal(employeeNumber).catch(() => {
      // Non-critical — backend may not be available yet
    });
  }, []);
  // Track the employee number that needs principal registration on session restore.
  // We store it separately so the registration effect can fire once the actor is ready.
  const [pendingRegisterEmp, setPendingRegisterEmp] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const stored =
      localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        const parsed = enforceBootstrapAdmin(JSON.parse(stored) as AuthUser);
        setUser(parsed);
        // Schedule principal registration — actor may not be ready yet, so
        // a dedicated effect below will execute it once the actor is available.
        if (parsed.employeeNumber) {
          setPendingRegisterEmp(parsed.employeeNumber);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  // Once the actor becomes available AND there is a pending registration from
  // a session restore, bind the principal — then clear the pending flag.
  useEffect(() => {
    if (actor && pendingRegisterEmp) {
      registerPrincipal(pendingRegisterEmp);
      setPendingRegisterEmp(null);
    }
  }, [actor, pendingRegisterEmp, registerPrincipal]);

  const login = async (
    employeeNumber: string,
    password: string,
    remember: boolean,
  ) => {
    const empNum = employeeNumber.trim();

    // PRIMARY PATH: Bootstrap admin — handled entirely in frontend, no backend call needed
    if (empNum === BOOTSTRAP_ADMIN_EMP) {
      if (password !== BOOTSTRAP_ADMIN_PASSWORD) {
        return {
          success: false,
          error: "Invalid employee number or password.",
        };
      }
      const adminUser: AuthUser = {
        id: "bootstrap-admin",
        name: BOOTSTRAP_ADMIN_NAME,
        email: "sumesh.j@rktrwheels.com",
        role: "systemAdmin",
        department: "EHS",
        employeeNumber: BOOTSTRAP_ADMIN_EMP,
        mobileNumber: "",
      };
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(SESSION_KEY, JSON.stringify(adminUser));
      setUser(adminUser);
      // Bind this IC principal to the admin employee number so the backend
      // can filter the activity feed for this session
      registerPrincipal(BOOTSTRAP_ADMIN_EMP);
      return { success: true };
    }

    if (!actor) {
      return {
        success: false,
        error: "Connection not ready. Please try again.",
      };
    }
    try {
      // SECONDARY PATH: Find regular user by employee number from backend
      const allUsers = await actor.getUsers();
      const backendUser = allUsers.find((u) => u.employeeNumber === empNum);
      if (!backendUser) {
        return {
          success: false,
          error: "Invalid employee number or password.",
        };
      }
      if (!backendUser.active) {
        return {
          success: false,
          error:
            "Account pending activation. Please contact your administrator.",
        };
      }
      // Attempt backend login using stored email (backend still uses email internally)
      const result = await actor.login(backendUser.email, password);
      if (result.__kind__ === "err") {
        return {
          success: false,
          error: "Invalid employee number or password.",
        };
      }
      const authUser: AuthUser = {
        id: backendUser.id,
        name: backendUser.name,
        email: backendUser.email,
        role: backendUser.role as AuthUser["role"],
        department: backendUser.department,
        employeeNumber: backendUser.employeeNumber,
        mobileNumber: backendUser.mobileNumber,
      };
      const finalUser = enforceBootstrapAdmin(authUser);
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem(SESSION_KEY, JSON.stringify(finalUser));
      setUser(finalUser);
      // Bind this IC principal to the logged-in user's employee number
      if (finalUser.employeeNumber) registerPrincipal(finalUser.employeeNumber);
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
              "Employee number already registered. Please sign in or contact your administrator.",
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
