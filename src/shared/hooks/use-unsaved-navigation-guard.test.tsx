import { cleanup, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUnsavedNavigationGuard } from "./use-unsaved-navigation-guard";

let originalNavigation: PropertyDescriptor | undefined;

beforeEach(() => {
  originalNavigation = Object.getOwnPropertyDescriptor(window, "navigation");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  if (originalNavigation) Object.defineProperty(window, "navigation", originalNavigation);
  else Reflect.deleteProperty(window, "navigation");
});

function installNavigationApi() {
  const navigation = new EventTarget();
  Object.defineProperty(window, "navigation", { configurable: true, value: navigation });
  return navigation;
}

function traversal(url: string, overrides: Partial<NavigateEvent> = {}) {
  const event = new Event("navigate", { cancelable: true }) as NavigateEvent;
  Object.defineProperties(event, {
    navigationType: { value: "traverse" },
    hashChange: { value: false },
    destination: { value: { sameDocument: true, url } },
    ...Object.fromEntries(Object.entries(overrides).map(([key, value]) => [key, { value }])),
  });
  return event;
}

describe("useUnsavedNavigationGuard", () => {
  it("blocks a same-origin sidebar link when the user rejects navigation", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderHook(() => useUnsavedNavigationGuard(true, "Discard edits?"));
    const link = document.createElement("a");
    link.href = "/runs";
    document.body.append(link);

    expect(fireEvent.click(link)).toBe(false);
    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm).toHaveBeenCalledWith("Discard edits?");
  });

  it("cancels Back or Forward traversal through the Navigation API", () => {
    const navigation = installNavigationApi();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderHook(() => useUnsavedNavigationGuard(true, "Discard edits?"));
    const event = traversal(`${window.location.origin}/overview`);

    expect(navigation.dispatchEvent(event)).toBe(false);
    expect(event.defaultPrevented).toBe(true);
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("allows accepted traversal and ignores hash-only traversal", () => {
    const navigation = installNavigationApi();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderHook(() => useUnsavedNavigationGuard(true, "Discard edits?"));
    const accepted = traversal(`${window.location.origin}/overview`);
    const hashOnly = traversal(`${window.location.href}#details`, { hashChange: true });

    expect(navigation.dispatchEvent(accepted)).toBe(true);
    expect(accepted.defaultPrevented).toBe(false);
    expect(navigation.dispatchEvent(hashOnly)).toBe(true);
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("protects full-page unloads and removes listeners when clean", () => {
    const { rerender } = renderHook(({ active }) => useUnsavedNavigationGuard(active, "Discard edits?"), { initialProps: { active: true } });
    const guarded = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(guarded);
    expect(guarded.defaultPrevented).toBe(true);

    rerender({ active: false });
    const clean = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
  });
});
