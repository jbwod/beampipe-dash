import { NextResponse } from "next/server";
import { beampipeUrl } from "@/server/beampipe/url";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = performance.now();
  try {
    const response = await fetch(beampipeUrl("/api/v2/health"), {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    const body = await response.json().catch(() => null);
    return NextResponse.json(
      {
        connected: response.ok,
        latency_ms: Math.round(performance.now() - started),
        health: body,
      },
      { status: response.ok ? 200 : 503 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        latency_ms: Math.round(performance.now() - started),
        error: error instanceof Error ? error.message : "Beampipe is unreachable",
      },
      { status: 503 },
    );
  }
}
