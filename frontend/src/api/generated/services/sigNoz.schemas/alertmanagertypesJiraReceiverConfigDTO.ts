/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesJiraDeploymentDTO } from './alertmanagertypesJiraDeploymentDTO';
import type { AlertmanagertypesJiraReceiverConfigDTOCustomFields } from './alertmanagertypesJiraReceiverConfigDTOCustomFields';
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';
import type { ModelDurationDTO } from './modelDurationDTO';

export interface AlertmanagertypesJiraReceiverConfigDTO {
	/**
	 * @type object
	 * @description Extra issue fields keyed by Jira field ID. Stored, but not currently included in the issue Jira receives.
	 */
	custom_fields?: AlertmanagertypesJiraReceiverConfigDTOCustomFields;
	/**
	 * @description The Jira edition, cloud or selfhosted; defaults to cloud.
	 */
	deployment?: AlertmanagertypesJiraDeploymentDTO;
	/**
	 * @type string
	 * @description Alertmanager template for the issue description.
	 */
	description?: string;
	/**
	 * @description HTTP client settings; basic auth carries the account email and API token on cloud, authorization carries the Bearer personal access token on self-hosted.
	 */
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 * @description The issue type name.
	 */
	issue_type?: string;
	/**
	 * @type array
	 * @description Labels added to every issue.
	 */
	labels?: string[];
	/**
	 * @type string
	 * @description The priority name assigned to new issues.
	 */
	priority?: string;
	/**
	 * @type string
	 * @description The key of the project issues are created in.
	 */
	project?: string;
	/**
	 * @description How long after resolution a firing alert reopens the issue; a Prometheus duration, at least 1m.
	 */
	reopen_duration?: ModelDurationDTO;
	/**
	 * @type string
	 * @description The transition applied when an alert fires again on a resolved issue.
	 */
	reopen_transition?: string;
	/**
	 * @type string
	 * @description The transition applied when the alert resolves.
	 */
	resolve_transition?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 * @description The Jira base URL.
	 */
	site?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the issue summary.
	 */
	summary?: string;
	/**
	 * @type string
	 * @description The resolution name that stops an issue from being reopened.
	 */
	wont_fix_resolution?: string;
}
