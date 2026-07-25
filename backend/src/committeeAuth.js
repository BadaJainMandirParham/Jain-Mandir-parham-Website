import bcrypt from "bcryptjs";

export const normalizePhoneValue = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length > 10 && digits.startsWith("91") && digits.length === 12) return digits.slice(2);
  if (digits.length > 10 && digits.startsWith("0") && digits.length === 11) return digits.slice(1);
  return digits;
};

const getCommitteeIdentityCandidates = (member) => {
  const candidates = [];
  const pushValue = (value) => {
    if (value === undefined || value === null) return;
    const text = String(value).trim();
    if (text) candidates.push(text);
  };

  pushValue(member?.email);
  pushValue(member?.phone);
  pushValue(member?.mobile);
  pushValue(member?.phone_number);
  pushValue(member?.mobile_number);
  return candidates;
};

export const matchesCommitteeIdentity = ({ member, input, debug = false }) => {
  const value = String(input || "").trim();
  if (!value) {
    if (debug) console.log("[verify-reset] Empty input value");
    return false;
  }

  const normalizedInput = value.toLowerCase();
  const normalizedInputPhone = normalizePhoneValue(value);

  if (debug) {
    console.log("[verify-reset] Comparison:", {
      memberName: member?.name,
      inputValue: value,
      normalizedInput,
      normalizedInputPhone,
      candidates: getCommitteeIdentityCandidates(member),
    });
  }

  return getCommitteeIdentityCandidates(member).some((candidate) => {
    const normalizedCandidate = candidate.toLowerCase();
    const normalizedCandidatePhone = normalizePhoneValue(candidate);
    return normalizedCandidate === normalizedInput || (normalizedCandidatePhone && normalizedInputPhone === normalizedCandidatePhone);
  });
};

export const verifyCommitteePassword = async ({ member, password, debug = false }) => {
  const input = String(password || "").trim();
  if (!input) {
    if (debug) console.log("[verify-password] Empty password value");
    return false;
  }

  const hash = member?.password_hash || member?.password;
  if (hash) {
    const candidateHash = String(hash).trim();
    if (candidateHash.startsWith("$2") || candidateHash.startsWith("$2a") || candidateHash.startsWith("$2b")) {
      try {
        const ok = await bcrypt.compare(input, candidateHash);
        if (ok) return true;
      } catch (error) {
        if (debug) console.log("[verify-password] bcrypt compare failed", error.message);
      }
    }
    if (candidateHash === input) return true;
  }

  return getCommitteeIdentityCandidates(member).some((candidate) => {
    const normalizedCandidate = candidate.toLowerCase();
    const normalizedInput = input.toLowerCase();
    if (normalizedCandidate === normalizedInput) return true;
    const normalizedCandidatePhone = normalizePhoneValue(candidate);
    const normalizedInputPhone = normalizePhoneValue(input);
    return Boolean(normalizedCandidatePhone && normalizedInputPhone && normalizedCandidatePhone === normalizedInputPhone);
  });
};
