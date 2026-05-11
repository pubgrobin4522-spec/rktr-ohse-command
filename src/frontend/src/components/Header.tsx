import type { ActivityFeedItem } from "@/backend";
import { GlobalSearch } from "@/components/GlobalSearch";
import { useAuth } from "@/contexts/AuthContext";
import {
  useActivityFeed,
  useMarkNotificationsRead,
  useNotifLastRead,
} from "@/hooks/useBackend";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/types";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Live activity feed — polls every 15 s
  const { data: feedRaw = [] } = useActivityFeed();
  const feed = feedRaw as ActivityFeedItem[];

  // Last-read timestamp from backend + optimistic local override
  const { data: serverLastRead } = useNotifLastRead();
  const { mutate: markRead } = useMarkNotificationsRead();
  const [localLastRead, setLocalLastRead] = useState<bigint | null>(null);
  // Use whichever is more recent between server and local optimistic value
  const notifLastRead: bigint | null = (() => {
    const srv = serverLastRead ?? null;
    if (localLastRead !== null && (srv === null || localLastRead > srv))
      return localLastRead;
    return srv;
  })();

  // Map category to dot colour type
  function notifType(category: string): "success" | "warning" | "danger" {
    const c = category.toLowerCase();
    if (
      c.includes("incident") ||
      c.includes("overdue") ||
      c.includes("expired") ||
      c.includes("high") ||
      c.includes("critical")
    )
      return "danger";
    if (
      c.includes("near") ||
      c.includes("pending") ||
      c.includes("submitted") ||
      c.includes("observation")
    )
      return "warning";
    return "success";
  }

  // Format timestamp → relative time string
  function relativeTime(ts: bigint | number): string {
    const diffMs = Date.now() - Number(ts);
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return `${Math.floor(diffH / 24)}d ago`;
  }

  // Show up to 8 most recent items
  const notifications = feed.slice(0, 8).map((item) => ({
    id: String(item.id),
    text: item.message,
    time: relativeTime(item.timestamp),
    type: notifType(item.category),
    timestamp: item.timestamp,
  }));

  // Unread = items newer than the last-read timestamp
  const unreadCount = notifications.filter((n) => {
    if (notifLastRead === null) return true;
    return BigInt(n.timestamp) > notifLastRead;
  }).length;
  const badgeCount = Math.min(unreadCount, 99);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  // Cmd/Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setShowProfile(false);
  };

  return (
    <header
      className="h-16 flex-shrink-0 flex items-center px-4 gap-4 sticky top-0 z-50"
      style={{
        background: "rgba(6,14,26,0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
      data-ocid="header"
    >
      {/* Left: Menu toggle + Logo */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          data-ocid="header.menu_toggle"
          className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-smooth"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <img
            src="/assets/rktr-logo.jpg"
            alt="RKTR Logo"
            className="w-7 h-7 object-contain"
          />
          <span className="font-display font-bold text-base text-white tracking-wide hidden sm:block">
            RKTR
          </span>
          <span
            className="text-xs font-bold px-1.5 py-0.5 rounded font-mono hidden sm:block"
            style={{
              background: "rgba(24,195,126,0.15)",
              color: "#18C37E",
              border: "1px solid rgba(24,195,126,0.3)",
            }}
          >
            OHSE
          </span>
        </div>
      </div>

      {/* Center: Search */}
      <div className="flex-1 max-w-md hidden md:flex">
        <button
          type="button"
          onClick={openSearch}
          data-ocid="header.search_input"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/30 text-sm transition-smooth hover:text-white/50 hover:border-white/20"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Search className="w-4 h-4 flex-shrink-0" />
          <span>Search incidents, permits, users…</span>
          <kbd
            className="ml-auto text-xs px-1.5 py-0.5 rounded"
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Safety Score Badge */}
        <div
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg mr-1"
          style={{
            background: "rgba(24,195,126,0.1)",
            border: "1px solid rgba(24,195,126,0.25)",
          }}
          data-ocid="header.safety_score"
        >
          <Zap className="w-3.5 h-3.5" style={{ color: "#18C37E" }} />
          <span
            className="text-sm font-bold font-display"
            style={{ color: "#18C37E" }}
          >
            94
          </span>
          <span className="text-xs text-white/40">Safe</span>
          <div
            className="w-1.5 h-1.5 rounded-full animate-pulse-accent"
            style={{ background: "#18C37E" }}
          />
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          data-ocid="header.theme_toggle"
          className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-smooth"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              const opening = !showNotifs;
              setShowNotifs(opening);
              setShowProfile(false);
              if (opening && unreadCount > 0) {
                // Optimistic clear — badge disappears instantly
                setLocalLastRead(BigInt(Date.now()) * 1_000_000n);
                markRead();
              }
            }}
            data-ocid="header.notifications_button"
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-smooth relative"
          >
            <Bell className="w-4 h-4" />
            {badgeCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: "#ef4444",
                  color: "white",
                  fontSize: "9px",
                }}
              >
                {badgeCount > 9 ? "9+" : badgeCount}
              </span>
            )}
          </button>
          {showNotifs && (
            <div
              className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-industrial overflow-hidden z-50"
              style={{
                background: "#0a1628",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              data-ocid="header.notifications.popover"
            >
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <span className="font-display font-semibold text-sm text-white">
                  Notifications
                </span>
                {badgeCount > 0 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: "rgba(24,195,126,0.15)",
                      color: "#18C37E",
                    }}
                  >
                    {badgeCount} new
                  </span>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-8 h-8 text-white/15 mx-auto mb-2" />
                  <p className="text-white/40 text-xs">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-smooth cursor-pointer"
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                          n.type === "success"
                            ? "bg-[#18C37E]"
                            : n.type === "warning"
                              ? "bg-yellow-400"
                              : "bg-red-400",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-white/80 leading-relaxed">
                          {n.text}
                        </p>
                        <p className="text-xs text-white/30 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div className="px-4 py-2.5">
                <button
                  type="button"
                  className="w-full text-xs text-center transition-smooth"
                  style={{ color: "#18C37E" }}
                  onClick={() => setShowNotifs(false)}
                >
                  View all notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowProfile(!showProfile);
              setShowNotifs(false);
            }}
            data-ocid="header.profile_button"
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-white/5 transition-smooth"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: "rgba(24,195,126,0.2)",
                color: "#18C37E",
                border: "1px solid rgba(24,195,126,0.3)",
              }}
            >
              {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
            </div>
            <div className="hidden md:block text-left min-w-0">
              <p className="text-xs font-medium text-white/80 truncate max-w-24">
                {user?.name ?? "User"}
              </p>
              <p className="text-xs text-white/30 truncate">
                {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
              </p>
            </div>
            <ChevronDown className="w-3 h-3 text-white/30" />
          </button>
          {showProfile && (
            <div
              className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-industrial overflow-hidden z-50"
              style={{
                background: "#0a1628",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              data-ocid="header.profile.dropdown_menu"
            >
              <div className="px-4 py-3 border-b border-white/5">
                <p className="font-medium text-sm text-white">{user?.name}</p>
                <p className="text-xs text-white/40 truncate">{user?.email}</p>
                <span
                  className="inline-block text-xs px-2 py-0.5 rounded-full mt-1 font-medium"
                  style={{
                    background: "rgba(24,195,126,0.15)",
                    color: "#18C37E",
                  }}
                >
                  {ROLE_LABELS[user?.role ?? ""] ?? user?.role}
                </span>
              </div>
              <div className="p-1.5">
                <button
                  type="button"
                  data-ocid="header.profile.settings_button"
                  onClick={() => {
                    navigate("/admin");
                    setShowProfile(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 text-sm transition-smooth"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  type="button"
                  data-ocid="header.profile.logout_button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 text-sm transition-smooth"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <GlobalSearch open={searchOpen} onClose={closeSearch} />
    </header>
  );
}
