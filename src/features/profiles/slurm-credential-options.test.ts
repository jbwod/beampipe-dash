import { describe, expect, it } from "vitest";
import type { SlurmCredentialSlot } from "@/shared/types/beampipe";
import { slurmCredentialOptionLabel, slurmCredentialSelectOptions } from "./slurm-credential-options";

const ready: SlurmCredentialSlot = {
  name: "hpc",
  private_key: true,
  public_key: true,
  passphrase: false,
  known_hosts: true,
};

const incomplete: SlurmCredentialSlot = {
  name: "setonix",
  private_key: false,
  public_key: false,
  passphrase: false,
  known_hosts: true,
};

describe("slurm credential select options", () => {
  it("labels missing keys and keeps a saved slot that is not listed", () => {
    expect(slurmCredentialOptionLabel(ready)).toBe("hpc");
    expect(slurmCredentialOptionLabel(incomplete)).toBe("setonix (missing private_key)");
    expect(slurmCredentialSelectOptions([ready, incomplete], "legacy")).toEqual([
      { value: "", label: "None" },
      { value: "hpc", label: "hpc" },
      { value: "setonix", label: "setonix (missing private_key)" },
      { value: "legacy", label: "legacy (not installed)" },
    ]);
  });

  it("does not duplicate the current slot when it is already listed", () => {
    expect(slurmCredentialSelectOptions([ready], "hpc")).toEqual([
      { value: "", label: "None" },
      { value: "hpc", label: "hpc" },
    ]);
  });

  it("still offers None when the inventory is empty", () => {
    expect(slurmCredentialSelectOptions([], null)).toEqual([{ value: "", label: "None" }]);
  });
});
