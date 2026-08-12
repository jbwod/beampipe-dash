"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardFetch } from "@/shared/lib/http";
import type {
  DiagnosticsResponse,
  CurrentUser,
  Execution,
  ExecutionArtifact,
  ExecutionObservation,
  ExecutionStatusDetail,
  ExecutionSummary,
  LedgerSnapshot,
  OperatorOverview,
  PaginatedExecutions,
  ProjectListItem,
  ProvenanceEvent,
  ReadyStatus,
  SchedulerJob,
  SourceRegistryRow,
  ValidationReport,
  Worker,
  WorkerLease,
  WorkerPool,
} from "@/shared/types/beampipe";

const LIVE = 5_000;

export function useCurrentUser() {
  return useQuery({ queryKey: ["session"], queryFn: () => dashboardFetch<CurrentUser>("/api/beampipe/user/me"), staleTime: 60_000 });
}

export function useOverview() {
  return useQuery({ queryKey: ["overview"], queryFn: () => dashboardFetch<OperatorOverview>("/api/beampipe/overview"), refetchInterval: LIVE });
}

export function useReady() {
  return useQuery({ queryKey: ["ready"], queryFn: () => dashboardFetch<ReadyStatus>("/api/beampipe/ready"), refetchInterval: 15_000 });
}

export function useMetrics() {
  return useQuery({ queryKey: ["metrics"], queryFn: () => dashboardFetch<string>("/api/beampipe/metrics"), refetchInterval: 10_000 });
}

export function useExecutions(query = "items_per_page=50") {
  return useQuery({
    queryKey: ["executions", query],
    queryFn: () => dashboardFetch<PaginatedExecutions>(`/api/beampipe/executions?${query}`),
    refetchInterval: LIVE,
  });
}

export function useExecution(id: string) {
  return useQuery({
    queryKey: ["execution", id],
    queryFn: () => dashboardFetch<Execution>(`/api/beampipe/executions/${id}`),
    refetchInterval: (query) => isTerminal((query.state.data as Execution | undefined)?.status) ? false : LIVE,
  });
}

export function useExecutionStatus(id: string) {
  return useQuery({ queryKey: ["execution-status", id], queryFn: () => dashboardFetch<ExecutionStatusDetail>(`/api/beampipe/executions/${id}/status`), refetchInterval: LIVE });
}

export function useExecutionSummary(id: string) {
  return useQuery({ queryKey: ["execution-summary", id], queryFn: () => dashboardFetch<ExecutionSummary>(`/api/beampipe/executions/${id}/summary`), refetchInterval: 10_000 });
}

export function useExecutionEvents(id: string) {
  return useQuery({ queryKey: ["execution-events", id], queryFn: () => dashboardFetch<ProvenanceEvent[]>(`/api/beampipe/executions/${id}/events`), refetchInterval: LIVE });
}

export function useExecutionObservations(id: string) {
  return useQuery({ queryKey: ["execution-observations", id], queryFn: () => dashboardFetch<ExecutionObservation[]>(`/api/beampipe/executions/${id}/observations?limit=200`), refetchInterval: LIVE });
}

export function useExecutionArtifacts(id: string) {
  return useQuery({ queryKey: ["execution-artifacts", id], queryFn: () => dashboardFetch<ExecutionArtifact[]>(`/api/beampipe/executions/${id}/artifacts`), refetchInterval: 15_000 });
}

export function useLedgerSnapshot(id: string) {
  return useQuery({ queryKey: ["execution-ledger", id], queryFn: () => dashboardFetch<LedgerSnapshot>(`/api/beampipe/executions/${id}/ledger-snapshot?include_manifest=true`), refetchInterval: LIVE });
}

export function useSources(project?: string) {
  const params = new URLSearchParams({ limit: "500" });
  if (project) params.set("project_module", project);
  return useQuery({
    queryKey: ["sources", project ?? "all"],
    queryFn: () => dashboardFetch<SourceRegistryRow[]>(`/api/beampipe/sources?${params}`),
    refetchInterval: 10_000,
  });
}

export function useProjects() {
  return useQuery({ queryKey: ["projects"], queryFn: () => dashboardFetch<ProjectListItem[]>("/api/beampipe/projects"), refetchInterval: 30_000 });
}

export function useProjectContracts() {
  return useQuery({ queryKey: ["project-contracts"], queryFn: () => dashboardFetch<ValidationReport[]>("/api/beampipe/projects/contracts"), refetchInterval: 30_000 });
}

export function useWorkers() {
  return useQuery({ queryKey: ["workers"], queryFn: () => dashboardFetch<Worker[]>("/api/beampipe/workers"), refetchInterval: LIVE });
}

export function useWorkerPools() {
  return useQuery({ queryKey: ["worker-pools"], queryFn: () => dashboardFetch<WorkerPool[]>("/api/beampipe/workers/pools"), refetchInterval: LIVE });
}

export function useWorkerLeases(includeExpired = false) {
  return useQuery({
    queryKey: ["worker-leases", includeExpired],
    queryFn: () => dashboardFetch<WorkerLease[]>(`/api/beampipe/workers/leases?include_expired=${includeExpired}`),
    refetchInterval: LIVE,
  });
}

export function useSchedulerJobs() {
  return useQuery({ queryKey: ["scheduler-jobs"], queryFn: () => dashboardFetch<SchedulerJob[]>("/api/beampipe/scheduler/jobs?limit=100"), refetchInterval: LIVE });
}

export function useDiagnostics() {
  return useQuery({ queryKey: ["diagnostics"], queryFn: () => dashboardFetch<DiagnosticsResponse>("/api/beampipe/diagnostics"), refetchInterval: 30_000, retry: false });
}

export function isTerminal(status: string | null | undefined) {
  return status ? ["completed", "failed", "cancelled", "not_submitted"].includes(status) : false;
}
