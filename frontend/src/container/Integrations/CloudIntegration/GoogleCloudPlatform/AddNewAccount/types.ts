/** Shared by both connection methods; agent setup leaves accountName and projectIds unused. */
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
