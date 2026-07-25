export const isCommitteeContentTable = (table) => table === "committee" || table === "committee_public";

export const shouldUseLocalContentWrite = (table, hasAdminToken) => isCommitteeContentTable(table) || !hasAdminToken;
