export const getResetTokenFromUrl = (search: string) => {
  const source = search || (typeof window !== "undefined" ? window.location.search : "");
  return new URLSearchParams(source).get("token") || "";
};

export const buildResetUrl = (baseUrl: string, token: string) => {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  return `${normalizedBase}/reset-password?token=${encodeURIComponent(token)}`;
};
