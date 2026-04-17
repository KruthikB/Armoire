"use client";

import { useState } from "react";
import { Menu, Shirt } from "lucide-react";
import Sidebar from "./Sidebar";
import type { SessionUser } from "@/lib/auth/session";

interface DashboardShellProps {
  user:     SessionUser;
  children: React.ReactNode;
}

export default function DashboardShell({ user, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-ink/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar user={user} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Content wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div className="flex lg:hidden items-center gap-3 px-4 h-14 border-b border-ink/[0.07] bg-surface-1 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 -ml-1 rounded-lg text-ink/50 hover:text-ink hover:bg-surface-3 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="w-6 h-6 rounded-md bg-brand-500 flex items-center justify-center flex-shrink-0">
            <Shirt className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-ink">Armoire</span>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
