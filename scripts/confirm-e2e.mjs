export function confirmMutatingE2E() {
  if (process.env.BEAMPIPE_DASH_E2E_CONFIRM_MUTATIONS !== "1") {
    throw new Error("Mutating browser checks are disabled. Point the dashboard at scripts/mock-beampipe.mjs, then set BEAMPIPE_DASH_E2E_CONFIRM_MUTATIONS=1.");
  }
}
