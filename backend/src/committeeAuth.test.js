import { describe, expect, it } from "vitest";
import { matchesCommitteeIdentity, verifyCommitteePassword } from "./committeeAuth.js";

describe("committee identity matching", () => {
  it("matches an email case-insensitively", () => {
    expect(matchesCommitteeIdentity({ member: { email: "Member@Example.com", phone: "9876543210" }, input: "member@example.com" })).toBe(true);
  });

  it("matches phone numbers with formatting differences", () => {
    expect(matchesCommitteeIdentity({ member: { email: "", phone: "+91 98765 43210" }, input: "9876543210" })).toBe(true);
    expect(matchesCommitteeIdentity({ member: { email: "", phone: "09876543210" }, input: "9876543210" })).toBe(true);
  });

  it("accepts the stored phone number as a password fallback", async () => {
    await expect(verifyCommitteePassword({ member: { phone: "9876543210" }, password: "9876543210" })).resolves.toBe(true);
  });

  it("accepts the stored email as a password fallback", async () => {
    await expect(verifyCommitteePassword({ member: { email: "member@example.com" }, password: "member@example.com" })).resolves.toBe(true);
  });

  it("does not match unrelated values", () => {
    expect(matchesCommitteeIdentity({ member: { email: "member@example.com", phone: "9876543210" }, input: "other@example.com" })).toBe(false);
  });
});
