/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface AlertmanagertypesChannelJiraAuthDTO {
	/**
	 * @type string
	 * @format password
	 * @description The Atlassian API token paired with email. Required when deployment is cloud. A secret; returned by create, update and fetch by ID, never by list.
	 */
	apiToken?: string;
	/**
	 * @type string
	 * @description The Atlassian account email used for basic auth. Required when deployment is cloud.
	 */
	email?: string;
	/**
	 * @type string
	 * @format password
	 * @description The Jira personal access token, sent as a Bearer header. Required when deployment is selfhosted. A secret; returned by create, update and fetch by ID, never by list.
	 */
	pat?: string;
}
