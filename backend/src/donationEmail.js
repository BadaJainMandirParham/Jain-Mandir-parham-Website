export const getDonationRecipientEmail = (donation = {}, fallbackEmail = "") => {
  const donorEmail = String(donation?.donor_email || donation?.email || "").trim();
  if (donorEmail) return donorEmail;

  const fallback = String(fallbackEmail || "").trim();
  return fallback;
};
