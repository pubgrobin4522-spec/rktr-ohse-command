import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function Layout() {
  const { isAuthenticated, isLoading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("rktr_sidebar_collapsed");
    if (stored) setCollapsed(stored === "true");
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("rktr_sidebar_collapsed", String(next));
      return next;
    });
  };

  if (isLoading) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: "#081426" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
            style={{
              borderColor: "rgba(24,195,126,0.3)",
              borderTopColor: "#18C37E",
            }}
          />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            Loading OHSE Command Center…
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#081426" }}
      data-ocid="app.layout"
    >
      <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header onMenuClick={toggleSidebar} />
        <main
          className="flex-1 overflow-y-auto"
          style={{ background: "#081426" }}
          data-ocid="app.main_content"
        >
          <Outlet />
          <p
            className="text-xs text-center py-4"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            Powered by Caffeine
          </p>
        </main>
      </div>
      <Toaster richColors theme="dark" position="top-right" />
    </div>
  );
}

export function PublicLayout() {
  return (
    <>
      <Outlet />
      <Toaster richColors theme="dark" position="top-right" />
    </>
  );
}
