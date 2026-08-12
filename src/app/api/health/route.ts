import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "beampipe-dash" }, {
    headers: { "Cache-Control": "no-store" },
  });
}
