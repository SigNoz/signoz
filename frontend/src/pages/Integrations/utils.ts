import history from 'lib/history';

export const handleContactSupport = (isCloudUser: boolean): void => {
	if (isCloudUser) {
		history.push('/support');
	} else {
		window.open('https://signoz.io/slack', '_blank');
	}
};

export const INTEGRATION_TELEMETRY_EVENTS = {
	INTEGRATIONS_ITEM_LIST_CLICKED: 'Integrations Page: Clicked an integration',
	INTEGRATIONS_DETAIL_CONNECT:
		'Integrations Detail Page: Connect integration button click',
	INTEGRATIONS_DETAIL_TEST_CONNECTION:
		'Integrations Detail Page: Test Connection button click for integration',
	INTEGRATIONS_DETAIL_REMOVE_INTEGRATION:
		'Integrations Detail Page: Remove Integration button click for integration',
	INTEGRATIONS_DETAIL_CONFIGURE_INSTRUCTION:
		'Integrations Detail Page: Navigate to configure an integration',
};
