export type SetupFlow = 'manual' | 'agent';

export interface GcpSetupFormValues {
	accountName: string;
	deploymentProjectId: string;
	deploymentRegion: string;
	projectIds: string[];
	sigNozApiUrl: string;
	sigNozApiKey: string;
	ingestionUrl: string;
	ingestionKey: string;
}
