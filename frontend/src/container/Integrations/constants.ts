export const INTEGRATION_TELEMETRY_EVENTS = {
	INTEGRATIONS_LIST_VISITED: 'Integrations Page: Visited the list page',
	INTEGRATIONS_ITEM_LIST_CLICKED: 'Integrations Page: Clicked an integration',
	INTEGRATIONS_DETAIL_CONNECT:
		'Integrations Detail Page: Clicked connect integration button',
	INTEGRATIONS_DETAIL_TEST_CONNECTION:
		'Integrations Detail Page: Clicked test Connection button for integration',
	INTEGRATIONS_DETAIL_REMOVE_INTEGRATION:
		'Integrations Detail Page: Clicked remove Integration button for integration',
	INTEGRATIONS_DETAIL_CONFIGURE_INSTRUCTION:
		'Integrations Detail Page: Navigated to configure an integration',
	AWS_INTEGRATION_ACCOUNT_REMOVED:
		'AWS Integration Detail page: Clicked remove Integration button for integration',
};

export const INTEGRATION_TYPES = {
	AWS_INTEGRATION: 'aws',
	AZURE_INTEGRATION: 'azure',
};

export const AWS_INTEGRATION = {
	id: INTEGRATION_TYPES.AWS_INTEGRATION,
	title: 'Amazon Web Services',
	description: 'One click setup for AWS monitoring with SigNoz',
	author: {
		name: 'SigNoz',
		email: 'integrations@signoz.io',
		homepage: 'https://signoz.io',
	},
	icon: `Logos/aws-dark.svg`,
	is_installed: false,
	is_new: true,
};

export const AZURE_INTEGRATION = {
	id: INTEGRATION_TYPES.AZURE_INTEGRATION,
	title: 'Microsoft Azure',
	description: 'One click setup for Azure monitoring with SigNoz',
	author: {
		name: 'SigNoz',
		email: 'integrations@signoz.io',
		homepage: 'https://signoz.io',
	},
	icon: `Logos/azure-openai.svg`,
	is_installed: false,
	is_new: true,
};

export const ONE_CLICK_INTEGRATIONS = [AWS_INTEGRATION, AZURE_INTEGRATION];
