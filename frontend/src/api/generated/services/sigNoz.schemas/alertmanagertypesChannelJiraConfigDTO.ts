/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesChannelJiraAuthDTO } from './alertmanagertypesChannelJiraAuthDTO';
import type { AlertmanagertypesChannelJiraConfigDTOCustomFields } from './alertmanagertypesChannelJiraConfigDTOCustomFields';
import type { AlertmanagertypesJiraDeploymentDTO } from './alertmanagertypesJiraDeploymentDTO';

export interface AlertmanagertypesChannelJiraConfigDTO {
	/**
	 * @description The credentials: email and apiToken when deployment is cloud, pat when deployment is selfhosted.
	 */
	auth: AlertmanagertypesChannelJiraAuthDTO;
	/**
	 * @type object,null
	 * @description Extra issue fields keyed by Jira field ID. Stored, but not currently included in the issue Jira receives.
	 */
	customFields?: AlertmanagertypesChannelJiraConfigDTOCustomFields;
	/**
	 * @description The Jira edition: cloud for an Atlassian-hosted site, selfhosted for Jira Server or Data Center.
	 */
	deployment: AlertmanagertypesJiraDeploymentDTO;
	/**
	 * @type string
	 * @description Alertmanager template for the issue description, rendered as markdown; defaults to the SigNoz Jira default.
	 */
	description?: string;
	/**
	 * @type string
	 * @description The issue type name, such as Bug.
	 */
	issueType: string;
	/**
	 * @type array,null
	 * @description Labels added to every issue.
	 */
	labels?: string[] | null;
	/**
	 * @type string
	 * @description The priority name assigned to new issues.
	 */
	priority?: string;
	/**
	 * @type string
	 * @description The key of the project issues are created in.
	 */
	project: string;
	/**
	 * @type string
	 * @description How long after resolution a firing alert reopens the issue instead of creating a new one, as a Prometheus duration in canonical form such as 3d; defaults to 3d.
	 */
	reopenDuration?: string;
	/**
	 * @type string
	 * @description The transition applied when an alert fires again on a resolved issue.
	 */
	reopenTransition?: string;
	/**
	 * @type string
	 * @description The transition applied to the issue when the alert resolves.
	 */
	resolveTransition?: string;
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to false.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @description The base URL of the Jira site, for example https://example.atlassian.net or https://jira.example.com.
	 */
	site: string;
	/**
	 * @type string
	 * @description Alertmanager template for the issue summary; defaults to the SigNoz Jira default.
	 */
	summary?: string;
	/**
	 * @type string
	 * @description The resolution name that stops an issue from being reopened.
	 */
	wontFixResolution?: string;
}
