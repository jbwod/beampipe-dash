import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AlertsView } from "./alerts-view";

afterEach(cleanup);

vi.mock("./queries", () => ({
  useNotificationChannels: () => ({ data: [], isError: false, isPending: false, isFetching: false, refetch: vi.fn() }),
  useAlertRules: () => ({ data: [], isError: false, isPending: false, isFetching: false, refetch: vi.fn() }),
  useAlertDeliveries: () => ({ data: [], isError: false, isPending: false, isFetching: false, refetch: vi.fn() }),
}));

vi.mock("@/features/monitoring/queries", () => ({
  useCurrentUser: () => ({ data: { is_superuser: true } }),
  useProjects: () => ({ data: [{ project_id: "wallaby" }] }),
}));

function renderAlerts() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><AlertsView /></QueryClientProvider>);
}

describe("notification channel editor", () => {
  it("requires and exposes a PagerDuty secret reference", () => {
    renderAlerts();
    fireEvent.click(screen.getByRole("button", { name: /channel/i }));
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "pagerduty" } });
    fireEvent.change(screen.getByLabelText("Webhook URL"), { target: { value: "https://events.pagerduty.com/v2/enqueue" } });
    fireEvent.change(screen.getByLabelText("Template"), { target: { value: "pagerduty" } });

    expect(screen.getByLabelText("Routing key source")).toHaveValue("env");
    expect(screen.getByLabelText("Routing key environment variable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create channel" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Routing key environment variable"), { target: { value: "PAGERDUTY_ROUTING_KEY" } });
    expect(screen.getByRole("button", { name: "Create channel" })).toBeEnabled();
  });

  it("exposes bounded SMTP authentication and password-reference fields", () => {
    renderAlerts();
    fireEvent.click(screen.getByRole("button", { name: /channel/i }));
    fireEvent.change(screen.getByLabelText("Kind"), { target: { value: "email" } });

    expect(screen.getByLabelText("SMTP port")).toHaveValue(587);
    expect(screen.getByLabelText("SMTP user")).toBeInTheDocument();
    expect(screen.getByLabelText("Password source")).toHaveValue("env");
    expect(screen.getByLabelText("Password environment variable")).toBeInTheDocument();
  });
});
