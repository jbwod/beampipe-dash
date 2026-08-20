import type { SlurmCredentialSlot } from "@/shared/types/beampipe";

export function slurmCredentialOptionLabel(slot: SlurmCredentialSlot): string {
  if (!slot.private_key) {
    return `${slot.name} (missing private_key)`;
  }
  return slot.name;
}

export function slurmCredentialSelectOptions(
  slots: SlurmCredentialSlot[] | undefined,
  current: string | null | undefined,
): Array<{ label: string; value: string }> {
  const options = [{ value: "", label: "None" }];
  const seen = new Set<string>();
  for (const slot of slots ?? []) {
    options.push({ value: slot.name, label: slurmCredentialOptionLabel(slot) });
    seen.add(slot.name);
  }
  const currentName = current?.trim() ?? "";
  if (currentName && !seen.has(currentName)) {
    options.push({ value: currentName, label: `${currentName} (not installed)` });
  }
  return options;
}
