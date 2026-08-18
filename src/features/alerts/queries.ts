"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardFetch } from "@/shared/lib/http";
import type { AlertDelivery, AlertRule, NotificationChannel } from "@/shared/types/beampipe";

export function useNotificationChannels() {
  return useQuery({
    queryKey: ["notification-channels"],
    queryFn: () => dashboardFetch<NotificationChannel[]>("/api/beampipe/notification-channels"),
    refetchInterval: 15_000,
  });
}

export function useAlertRules() {
  return useQuery({
    queryKey: ["alert-rules"],
    queryFn: () => dashboardFetch<AlertRule[]>("/api/beampipe/alert-rules"),
    refetchInterval: 15_000,
  });
}

export function useAlertDeliveries(limit = 50) {
  return useQuery({
    queryKey: ["alert-deliveries", limit],
    queryFn: () => dashboardFetch<AlertDelivery[]>(`/api/beampipe/alert-deliveries?limit=${limit}`),
    refetchInterval: 5_000,
  });
}
