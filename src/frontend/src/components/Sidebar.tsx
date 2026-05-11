import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart2,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileCheck,
  GraduationCap,
  LayoutDashboard,
  Leaf,
  Settings,
  Shield,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { motion } from "motion/react";
import { NavLink, useLocation } from "react-router-dom";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const NAV_ITEMS = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "incidents",
    label: "Incidents",
    path: "/incidents",
    icon: AlertTriangle,
  },
  { id: "permits", label: "Permit To Work", path: "/permits", icon: FileCheck },
  {
    id: "risk-assessment",
    label: "Risk Assessment",
    path: "/risk-assessment",
    icon: ShieldAlert,
  },
  {
    id: "inspections",
    label: "Inspections",
    path: "/inspections",
    icon: ClipboardCheck,
  },
  { id: "training", label: "Training", path: "/training", icon: GraduationCap },
  { id: "environment", label: "Environment", path: "/environment", icon: Leaf },
  { id: "esg", label: "ESG Tracker", path: "/esg", icon: BarChart3 },
  { id: "capa", label: "CAPA Tracker", path: "/capa", icon: Wrench },
  {
    id: "observations",
    label: "Observations",
    path: "/observations",
    icon: Eye,
  },
  { id: "analytics", label: "Analytics", path: "/analytics", icon: BarChart2 },
];

const ADMIN_ITEMS = [
  { id: "admin", label: "Admin Panel", path: "/admin", icon: Settings },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === "systemAdmin" || user?.role === "ehsManager";

  const allItems = isAdmin ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS;

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative flex-shrink-0 flex flex-col h-full overflow-hidden"
      style={{
        background: "#060e1a",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
      data-ocid="sidebar"
    >
      {/* Logo area */}
      <div className="flex items-center h-16 px-4 gap-3 border-b border-white/5">
        <div
          className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center"
          style={{
            background: "rgba(24,195,126,0.15)",
            border: "1px solid rgba(24,195,126,0.3)",
          }}
        >
          <Shield className="w-4 h-4" style={{ color: "#18C37E" }} />
        </div>
        <motion.div
          animate={{
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : "auto",
          }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden whitespace-nowrap"
        >
          <span className="font-display font-bold text-sm tracking-wide text-white">
            RKTR OHSE
          </span>
        </motion.div>
      </div>

      {/* Nav items */}
      <nav
        className="flex-1 overflow-y-auto overflow-x-hidden py-3 scrollbar-thin"
        data-ocid="sidebar.nav"
      >
        {allItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path !== "/dashboard" &&
              location.pathname.startsWith(item.path));
          return (
            <NavLink
              key={item.id}
              to={item.path}
              data-ocid={`sidebar.${item.id}.link`}
              className={cn(
                "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg mb-0.5 transition-smooth group relative",
                isActive
                  ? "text-[#18C37E]"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5",
              )}
              style={
                isActive
                  ? {
                      background: "rgba(24,195,126,0.12)",
                      border: "1px solid rgba(24,195,126,0.2)",
                    }
                  : {}
              }
            >
              {isActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                  style={{ background: "#18C37E" }}
                />
              )}
              <Icon className="flex-shrink-0 w-4 h-4" />
              <motion.span
                animate={{
                  opacity: collapsed ? 0 : 1,
                  width: collapsed ? 0 : "auto",
                }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap text-sm font-medium"
              >
                {item.label}
              </motion.span>
              {collapsed && (
                <div className="absolute left-14 bg-card border border-border px-2 py-1 rounded text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-smooth">
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-white/5">
        <button
          type="button"
          onClick={onToggle}
          data-ocid="sidebar.toggle"
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-smooth"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
          <motion.span
            animate={{
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : "auto",
            }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden whitespace-nowrap text-xs"
          >
            Collapse
          </motion.span>
        </button>
      </div>
    </motion.aside>
  );
}
