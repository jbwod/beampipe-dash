"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardFetch } from "@/shared/lib/http";
import type { DeploymentProfileResponse, SlurmCredentialListResponse } from "@/shared/types/beampipe";

export function useDeploymentProfiles() {
  return useQuery({
    queryKey: ["deployment-profiles"],
    queryFn: () => dashboardFetch<DeploymentProfileResponse[]>("/api/beampipe/deployment-profiles"),
    refetchInterval: 30_000,
  });
}

export function useSlurmCredentialSlots() {
  return useQuery({
    queryKey: ["slurm-credentials"],
    queryFn: () => dashboardFetch<SlurmCredentialListResponse>("/api/beampipe/slurm/credentials"),
    refetchInterval: 30_000,
  });
}
