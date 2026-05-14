import { ONE_CLICK_INTEGRATIONS } from '../constants';
import { IntegrationType } from '../types';

export const getAccountById = <T extends { cloud_account_id: string }>(
	accounts: T[],
	accountId: string,
): T | null =>
	accounts.find((account) => account.cloud_account_id === accountId) || null;

interface IntegrationMetadata {
	title: string;
	description: string;
	logo: string;
}

export const getIntegrationMetadata = (
	type: IntegrationType,
): IntegrationMetadata => {
	const integration = ONE_CLICK_INTEGRATIONS.find(
		(integration) => integration.id === type,
	);

	if (!integration) {
		return { title: '', description: '', logo: '' };
	}

	return {
		title: integration.title,
		description: integration.description,
		logo: integration.icon,
	};
};
