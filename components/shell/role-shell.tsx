"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState, useSyncExternalStore, useTransition } from "react";

import { signOut } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { BrandMark } from "@/components/brand/brand-mark";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NAV_BY_ROLE, ROLE_META, type NavItem } from "./nav-config";

const COLLAPSED_EVENT = "shell:sidebar-collapsed-change";

function subscribeCollapsed(cb: () => void) {
  window.addEventListener(COLLAPSED_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(COLLAPSED_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function getCollapsedSnapshot() {
  return window.localStorage.getItem(COLLAPSED_KEY) === "1";
}

function getCollapsedServerSnapshot() {
  return false;
}

type ShellUser = {
  name: string;
  subtitle: string;
};

type Props = {
  role: Role;
  user: ShellUser;
  children: React.ReactNode;
};

const COLLAPSED_KEY = "shell:sidebar-collapsed";

function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function isActive(pathname: string, item: NavItem, roleRoot: string): boolean {
  if (item.href === pathname) return true;
  if (item.href === roleRoot) return false;
  return pathname.startsWith(`${item.href}/`);
}

export function RoleShell({ role, user, children }: Props) {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [, startSignOut] = useTransition();
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot
  );

  const toggleCollapsed = () => {
    try {
      window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "0" : "1");
      window.dispatchEvent(new Event(COLLAPSED_EVENT));
    } catch {}
  };

  const items = NAV_BY_ROLE[role];
  const subtitle = ROLE_META[role].subtitle;
  const roleRoot = `/${role}`;

  const handleSignOut = () => {
    startSignOut(async () => {
      await signOut();
    });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar — pinned to viewport so footer stays visible */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-border bg-white transition-[width] duration-200 ease-out md:flex md:flex-col",
          collapsed ? "w-[68px]" : "w-60"
        )}
      >
        <SidebarContent
          user={user}
          items={items}
          pathname={pathname}
          subtitle={subtitle}
          roleRoot={roleRoot}
          collapsed={collapsed}
          onSignOut={handleSignOut}
        />
        {/* Collapse handle — floats on the right edge */}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-[58px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white text-muted-foreground shadow-sm transition-colors hover:border-foreground/30 hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-white px-4 md:hidden">
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <BrandMark size={26} />
            <span className="text-sm font-semibold tracking-tight">
              {subtitle}
            </span>
          </div>
        </div>
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
          aria-label={user.name}
        >
          {initials(user.name)}
        </span>
      </div>

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-[78%] max-w-[280px] p-0"
          showCloseButton={false}
        >
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <div className="flex min-w-0 items-center gap-2">
              <BrandMark size={28} />
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-semibold tracking-tight">
                  Outpatient Triage
                </span>
                <span className="truncate text-[11px] text-muted-foreground">
                  {subtitle}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <SidebarContent
            user={user}
            items={items}
            pathname={pathname}
            subtitle={subtitle}
            roleRoot={roleRoot}
            collapsed={false}
            variant="drawer"
            onSignOut={handleSignOut}
            onNavigate={() => setOpen(false)}
            hideBrand
          />
        </SheetContent>
      </Sheet>

      {/* Page content — min-w-0 prevents the main column from growing beyond
          the viewport when child content (wide tables) sets a min-width. */}
      <main className="min-w-0 flex-1 pt-14 md:pt-0">{children}</main>
    </div>
  );
}

function SidebarContent({
  user,
  items,
  pathname,
  subtitle,
  roleRoot,
  collapsed,
  variant = "sidebar",
  onSignOut,
  onNavigate,
  hideBrand = false,
}: {
  user: ShellUser;
  items: NavItem[];
  pathname: string;
  subtitle: string;
  roleRoot: string;
  collapsed: boolean;
  variant?: "sidebar" | "drawer";
  onSignOut: () => void;
  onNavigate?: () => void;
  hideBrand?: boolean;
}) {
  return (
    <>
      {!hideBrand && (
        <div
          className={cn(
            "flex h-16 items-center border-b border-border",
            collapsed ? "justify-center px-2" : "gap-2.5 px-4"
          )}
        >
          <BrandMark size={collapsed ? 28 : 32} />
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold tracking-tight">
                Outpatient Triage
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {subtitle}
              </span>
            </div>
          )}
        </div>
      )}
      <nav
        className={cn(
          "flex-1 overflow-y-auto py-3",
          collapsed ? "px-2" : "px-3"
        )}
        aria-label="Main navigation"
      >
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active = isActive(pathname, item, roleRoot);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center rounded-md text-sm font-medium transition-colors",
                    collapsed ? "h-10 justify-center" : "h-9 gap-3 px-2.5",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[17px] w-[17px]",
                      active && "text-primary"
                    )}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div
        className={cn(
          "border-t border-border",
          collapsed ? "p-2" : "p-3"
        )}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-medium"
              title={user.name}
            >
              {initials(user.name)}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Sign out"
              onClick={onSignOut}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : variant === "drawer" ? (
          <>
            <div className="flex items-center gap-3 px-1 pb-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-medium">
                {initials(user.name)}
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-[13px] font-medium">
                  {user.name}
                </div>
                <div className="truncate text-[11.5px] text-muted-foreground">
                  {user.subtitle}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-[13.5px] font-medium text-foreground/80 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="h-[17px] w-[17px]" />
              Sign out
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2.5 rounded-md p-1.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {initials(user.name)}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[12.5px] font-medium">
                {user.name}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {user.subtitle}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Sign out"
              onClick={onSignOut}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
