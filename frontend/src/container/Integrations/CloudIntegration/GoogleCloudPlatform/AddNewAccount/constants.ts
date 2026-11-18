import { GcpSetupFormValues } from './types';

export const DEFAULT_SETUP_FORM_VALUES: GcpSetupFormValues = {
	accountName: '',
	deploymentProjectId: '',
	deploymentRegion: '',
	projectIds: [],
	sigNozApiUrl: '',
	sigNozApiKey: '',
	ingestionUrl: '',
	ingestionKey: '',
};

export const MANUAL_SETUP_GUIDE = {
	description:
		'Please follow our setup guide to create the resources needed to complete the integration.',
	docsUrl: 'https://signoz.io/docs/integrations/gcp/gcp-integration/',
	linkLabel: 'View setup guide',
};

export const AGENT_SETUP_GUIDE = {
	description:
		'SigNoz integration sets up everything needed to collect telemetry from your project.',
	// TODO: point to the agent setup docs once they are published.
	docsUrl: 'https://signoz.io/docs/integrations/gcp/gcp-integration/',
	linkLabel: 'Learn more',
};
