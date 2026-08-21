"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardFetch } from "@/shared/lib/http";
import type { ProjectConfigRow, ProvenanceEvent, ValidationReport } from "@/shared/types/beampipe";

export function useProjectConfig(id: string | null) {
  return useQuery({
    queryKey: ["project-config", id],
    queryFn: () => dashboardFetch<ProjectConfigRow>(`/api/beampipe/project-configs/${encodeURIComponent(id!)}`),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useProjectVersions(id: string | null) {
  return useQuery({
    queryKey: ["project-versions", id],
    queryFn: () => dashboardFetch<ProjectConfigRow[]>(`/api/beampipe/project-configs/${encodeURIComponent(id!)}/versions`),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useProjectContract(id: string | null) {
  return useQuery({
    queryKey: ["project-contract", id],
    queryFn: () => dashboardFetch<ValidationReport>(`/api/beampipe/projects/contracts/${encodeURIComponent(id!)}`),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useProjectEvents(id: string | null) {
  return useQuery({
    queryKey: ["project-events", id],
    queryFn: () => dashboardFetch<ProvenanceEvent[]>(`/api/beampipe/projects/${encodeURIComponent(id!)}/events?limit=50`),
    enabled: Boolean(id),
    refetchInterval: 30_000,
  });
}
