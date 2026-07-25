import test from "node:test";
import assert from "node:assert/strict";
import { getDonationRecipientEmail } from "../src/donationEmail.js";

test("prefers the donor email from the donation record", () => {
  const recipient = getDonationRecipientEmail({ donor_email: "donor@example.com", email: "fallback@example.com" });
  assert.equal(recipient, "donor@example.com");
});

test("falls back to the submitted email when the saved donation has no recipient email", () => {
  const recipient = getDonationRecipientEmail({ email: "" }, "submitted@example.com");
  assert.equal(recipient, "submitted@example.com");
});

test("returns an empty string when there is no email to send to", () => {
  const recipient = getDonationRecipientEmail({}, "   ");
  assert.equal(recipient, "");
});
