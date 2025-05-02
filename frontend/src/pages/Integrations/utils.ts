import history from 'lib/history';

export const handleContactSupport = (isCloudUser: boolean): void => {
	if (isCloudUser) {
		history.push('/support');
	} else {
		window.open('https://signoz.io/slack', '_blank');
	}
};

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
	AWS_INTEGRATION: 'aws-integration',
};
