export const getAccountById = <T extends { cloud_account_id: string }>(
	accounts: T[],
	accountId: string,
): T | null =>
	accounts.find((account) => account.cloud_account_id === accountId) || null;
