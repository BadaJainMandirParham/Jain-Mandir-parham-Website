import { describe, expect, it } from "vitest";
import { buildResetUrl, getResetTokenFromUrl } from "./passwordReset";

describe("password reset helpers", () => {
  it("extracts a reset token from the current URL", () => {
    expect(getResetTokenFromUrl("?token=abc123")).toBe("abc123");
    expect(getResetTokenFromUrl("?foo=bar")).toBe("");
  });

  it("builds a reset URL with the token encoded", () => {
    expect(buildResetUrl("https://example.com", "abc/123")).toBe("https://example.com/reset-password?token=abc%2F123");
    expect(buildResetUrl("https://example.com/", "abc123")).toBe("https://example.com/reset-password?token=abc123");
  });
});
