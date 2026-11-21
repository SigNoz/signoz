/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesChannelPagerdutyConfigDTODetails } from './alertmanagertypesChannelPagerdutyConfigDTODetails';

export interface AlertmanagertypesChannelPagerdutyConfigDTO {
	/**
	 * @type string
	 * @description The class or type of the event.
	 */
	class?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the client identifier; defaults to the Alertmanager PagerDuty default.
	 */
	client?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the client URL; defaults to the Alertmanager PagerDuty default.
	 */
	clientUrl?: string;
	/**
	 * @type string
	 * @description The component of the source machine that is responsible for the event.
	 */
	component?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the incident summary; defaults to the Alertmanager PagerDuty default.
	 */
	description?: string;
	/**
	 * @type object,null
	 * @description Custom details keyed by name, each an Alertmanager template; defaults to the Alertmanager firing and resolved summary set.
	 */
	details?: AlertmanagertypesChannelPagerdutyConfigDTODetails;
	/**
	 * @type string
	 * @description The logical grouping of components the event belongs to.
	 */
	group?: string;
	/**
	 * @type string
	 * @format password
	 * @description The Events API v2 integration key. A secret; returned by create, update and fetch by ID, never by list.
	 */
	routingKey: string;
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to true.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @description The incident severity: critical, error, warning or info.
	 */
	severity?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the unique location of the affected system; defaults to client.
	 */
	source?: string;
	/**
	 * @type string
	 * @description The Events API endpoint; empty uses the PagerDuty default.
	 */
	url?: string;
}
