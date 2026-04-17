"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Shirt, MessageSquare, LayoutGrid, LogOut, Heart, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/session";

interface SidebarProps {
  user:    SessionUser;
  onClose?: () => void;
}

const NAV_ITEMS = [
  { href: "/wardrobe",  icon: Shirt,          label: "Wardrobe"   },
  { href: "/chat",      icon: MessageSquare,  label: "Style Chat" },
  { href: "/outfits",   icon: LayoutGrid,     label: "Outfits"    },
  { href: "/favorites", icon: Heart,          label: "Favorites"  },
  { href: "/settings",  icon: Settings,       label: "Settings"   },
];

export default function Sidebar({ user, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-60 flex flex-col h-full border-r border-ink/[0.07] bg-surface-1 flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-ink/[0.07]">
        <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
          <Shirt className="w-4 h-4 text-white" />
        </div>
        <div className="leading-tight">
          <span className="font-semibold text-ink tracking-tight block">Armoire</span>
          <span className="text-[10px] text-ink/40 tracking-wide">powered by Aria</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-brand-500/10 text-brand-600"
                  : "text-ink/50 hover:text-ink hover:bg-surface-2"
              )}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + sign out */}
      <div className="p-3 border-t border-ink/[0.07]">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-brand-500/15 flex items-center justify-center text-brand-600 text-sm font-bold flex-shrink-0">
            {(user.name ?? user.email)[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">{user.name}</p>
            <p className="text-xs text-ink/40 truncate">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-ink/30 hover:text-ink/70 transition-colors p-1 rounded-lg hover:bg-surface-3"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
