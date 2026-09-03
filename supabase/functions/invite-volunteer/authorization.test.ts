import { describe, expect, it } from "vitest";
import { canSendVolunteerInvitation } from "./authorization";

describe("volunteer invitation authorization", () => {
  it("allows active coordinators and administrators", () => {
    expect(canSendVolunteerInvitation({ role: "coordinator", status: "active" })).toBe(true);
    expect(canSendVolunteerInvitation({ role: "admin", status: "active" })).toBe(true);
  });

  it("rejects inactive accounts and non-staff roles", () => {
    expect(canSendVolunteerInvitation({ role: "admin", status: "suspended" })).toBe(false);
    expect(canSendVolunteerInvitation({ role: "volunteer", status: "active" })).toBe(false);
    expect(canSendVolunteerInvitation(null)).toBe(false);
  });
});
