"use client";

import { useQuery } from "@tanstack/react-query";
import { LogOut, RadioTower } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { useEffect } from "react";
import { navigation } from "./navigation";
import { cn } from "@/shared/lib/cn";
import { dashboardFetch } from "@/shared/lib/http";

interface CurrentUser {
  username: string;
  name: string;
  is_superuser: boolean;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => dashboardFetch<CurrentUser>("/api/beampipe/user/me"),
    retry: false,
  });

  useEffect(() => {
    if (session.isError) router.replace("/login");
  }, [router, session.isError]);

  if (session.isError) {
    return <div className="grid min-h-dvh place-items-center text-xs text-[var(--bp-muted)]">[ session expired ]</div>;
  }

  const items = navigation;

  return (
    <div className="min-h-dvh bg-[var(--bp-bg)]">
      <header className="sticky top-0 z-30 flex h-8 items-center border-b border-[var(--bp-border)] bg-black px-2 text-[11px] text-[var(--bp-muted)] sm:px-3">
        <Link className="flex items-center gap-2 text-[var(--bp-text)]" href="/overview">
          <RadioTower className="size-3.5 text-[var(--bp-cyan)]" aria-hidden="true" />
          <span>[0] beampipe:dash</span>
        </Link>
        <span className="mx-3 hidden text-[var(--bp-border)] sm:inline">|</span>
        <span className="hidden truncate sm:inline">~/control-plane{pathname}</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden max-w-48 truncate md:inline">
            {session.data?.name ?? "connecting"}
          </span>
          <button
            aria-label="Sign out"
            className="grid size-6 place-items-center text-[var(--bp-muted)] hover:text-[var(--bp-red)]"
            onClick={async () => {
              await dashboardFetch("/api/session/logout", { method: "POST" }).catch(() => null);
              router.replace("/login");
              router.refresh();
            }}
            title="Sign out"
            type="button"
          >
            <LogOut className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1920px] md:grid-cols-[208px_minmax(0,1fr)]">
        <aside className="sticky top-8 z-20 overflow-x-auto border-b border-[var(--bp-border)] bg-[var(--bp-panel)] md:h-[calc(100dvh-2rem)] md:border-r md:border-b-0">
          <nav aria-label="Primary" className="flex min-w-max p-1.5 md:block md:min-w-0 md:p-3">
            {items.map(({ href, label, icon: Icon }, index) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  className={cn(
                    "flex h-9 items-center gap-2 border border-transparent px-2.5 text-xs text-[var(--bp-muted)] md:mb-1",
                    "hover:border-[var(--bp-border-soft)] hover:bg-black hover:text-[var(--bp-text)]",
                    active && "border-[var(--bp-border)] bg-black text-[var(--bp-cyan)]",
                  )}
                  href={href as Route}
                  key={href}
                >
                  <span className="w-5 tabular-nums text-[10px] text-[var(--bp-subtle)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="absolute right-3 bottom-3 left-3 hidden border-t border-[var(--bp-border-soft)] pt-3 text-[10px] leading-5 text-[var(--bp-subtle)] md:block">
            <p>API / v2</p>
            <p>TRUTH / PostgreSQL</p>
            <p>RUNTIME / REST + Slurm</p>
          </div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
