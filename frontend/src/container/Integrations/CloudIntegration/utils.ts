import { CloudAccount } from './AmazonWebServices/types';

export const getAccountById = (
	accounts: CloudAccount[],
	accountId: string,
): CloudAccount | null =>
	accounts.find((account) => account.cloud_account_id === accountId) || null;
