import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDeploymentProfile } from "./profile-draft";
import { ProfilesView } from "./profiles-view";

const profile = {
  ...createDeploymentProfile(),
  uuid: "profile-1",
  revision: 1,
  spec_sha256: "abc123",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: null,
};

vi.mock("./queries", () => ({
  useDeploymentProfiles: () => ({ data: [profile], isPending: false, isError: false, refetch: vi.fn() }),
  useSlurmCredentialSlots: () => ({ data: { slots: [] }, isPending: false, isError: false, isSuccess: true }),
}));

vi.mock("@/features/monitoring/queries", () => ({
  useCurrentUser: () => ({ data: { is_superuser: true } }),
  useDiagnostics: () => ({ data: { diagnostics: [] } }),
  useMetrics: () => ({ data: "", isPending: false }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("deployment profile navigation", () => {
  it("marks a duplicate as unsaved and blocks sidebar navigation", () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    render(<QueryClientProvider client={client}><ProfilesView /></QueryClientProvider>);
    fireEvent.click(screen.getByLabelText("Duplicate profile"));

    expect(screen.getByText("~ unsaved changes")).toBeInTheDocument();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const sidebarLink = document.createElement("a");
    sidebarLink.href = "/overview";
    document.body.append(sidebarLink);

    expect(fireEvent.click(sidebarLink)).toBe(false);
    expect(confirm).toHaveBeenCalledWith("Discard unsaved deployment profile changes?");
  });
});
