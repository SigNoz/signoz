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
		'Please go through our GCP integration guide, which covers all prerequisites — service account, IAM roles, and resource setup.',
	docsUrl: 'https://signoz.io/docs/integrations/gcp/gcp-integration/',
	linkLabel: 'GCP integration guide',
};

export const AGENT_SETUP_GUIDE = {
	description:
		'Check our docs to learn how the SigNoz agent integration works, what it deploys in your project, and the permissions needed to run the setup commands.',
	// TODO: point to the agent setup docs once they are published.
	docsUrl: 'https://signoz.io/docs/integrations/gcp/gcp-integration/',
	linkLabel: 'GCP agent integration docs',
};
