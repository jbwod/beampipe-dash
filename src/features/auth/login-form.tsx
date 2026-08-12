"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, LoaderCircle, RadioTower } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { dashboardFetch } from "@/shared/lib/http";

interface ConnectionState {
  connected: boolean;
  latency_ms: number;
  health?: { status?: string; service?: string };
  error?: string;
}

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const connection = useQuery({
    queryKey: ["connection"],
    queryFn: () => dashboardFetch<ConnectionState>("/api/connection"),
    retry: false,
    refetchInterval: 10_000,
  });
  const login = useMutation({
    mutationFn: () =>
      dashboardFetch<{ authenticated: boolean }>("/api/session/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      }),
    onSuccess: () => {
      router.push("/overview");
      router.refresh();
    },
  });

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <section className="ascii-corners w-full max-w-[440px] border border-[var(--bp-border)] bg-[var(--bp-panel)]">
        <header className="flex h-9 items-center justify-between border-b border-[var(--bp-border)] px-3 text-[11px] text-[var(--bp-muted)]">
          <span>[ AUTH / BEAMPIPE V2 ]</span>
          <span className="flex items-center gap-2 tabular-nums">
            <span
              className={`size-1.5 ${connection.data?.connected ? "bg-[var(--bp-green)]" : "bg-[var(--bp-red)]"}`}
            />
            {connection.isPending
              ? "probing"
              : connection.data?.connected
                ? `${connection.data.latency_ms}ms`
                : "offline"}
          </span>
        </header>

        <div className="px-5 py-7 sm:px-7">
          <div className="mb-8 flex items-start gap-4">
            <div className="grid size-10 shrink-0 place-items-center border border-[var(--bp-cyan)] text-[var(--bp-cyan)]">
              <RadioTower className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="mb-1 text-xs text-[var(--bp-cyan)]">$ beampipe dash</p>
              <h1 className="text-balance text-xl font-semibold">Operator sign in</h1>
              <p className="mt-2 text-pretty text-xs leading-5 text-[var(--bp-muted)]">
                Authenticate against the connected Beampipe control plane.
              </p>
            </div>
          </div>

          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              login.mutate();
            }}
          >
            <label className="block text-xs text-[var(--bp-muted)]">
              USERNAME
              <input
                autoComplete="username"
                autoFocus
                className="mt-2 h-10 w-full border border-[var(--bp-border)] bg-black px-3 text-sm text-[var(--bp-text)] outline-none placeholder:text-[var(--bp-subtle)] focus:border-[var(--bp-cyan)]"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="operator"
                required
                value={username}
              />
            </label>
            <label className="block text-xs text-[var(--bp-muted)]">
              PASSWORD
              <input
                autoComplete="current-password"
                className="mt-2 h-10 w-full border border-[var(--bp-border)] bg-black px-3 text-sm text-[var(--bp-text)] outline-none placeholder:text-[var(--bp-subtle)] focus:border-[var(--bp-cyan)]"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>

            {login.error ? (
              <p className="border-l-2 border-[var(--bp-red)] pl-3 text-xs leading-5 text-[var(--bp-red)]">
                {login.error.message}
              </p>
            ) : null}

            <button
              className="flex h-10 w-full items-center justify-between border border-[var(--bp-cyan)] px-3 text-sm text-[var(--bp-cyan)] hover:bg-[var(--bp-selection)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={login.isPending || !connection.data?.connected}
              type="submit"
            >
              <span>{login.isPending ? "AUTHENTICATING" : "CONTINUE"}</span>
              {login.isPending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ArrowRight className="size-4" aria-hidden="true" />
              )}
            </button>
          </form>
        </div>

        <footer className="flex min-h-9 items-center gap-2 border-t border-[var(--bp-border)] px-3 text-[11px] text-[var(--bp-muted)]">
          <Activity className="size-3.5" aria-hidden="true" />
          {connection.data?.connected
            ? `${connection.data.health?.service ?? "beampipe-v2"} reports ${connection.data.health?.status ?? "ok"}`
            : connection.data?.error ?? "Waiting for Beampipe"}
        </footer>
      </section>
    </main>
  );
}
