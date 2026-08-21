"use client";

import { useCallback, useEffect } from "react";

export function useUnsavedNavigationGuard(active: boolean, message: string) {
  const confirmNavigation = useCallback(() => !active || window.confirm(message), [active, message]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!active) return;
      event.preventDefault();
    };
    const click = (event: MouseEvent) => {
      if (!active || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!target || target.target === "_blank" || target.hasAttribute("download")) return;
      const destination = new URL(target.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.href === window.location.href) return;
      if (!confirmNavigation()) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [active, confirmNavigation]);

  return confirmNavigation;
}
