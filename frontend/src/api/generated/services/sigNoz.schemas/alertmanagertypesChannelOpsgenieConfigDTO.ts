/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesChannelOpsgenieConfigDTODetails } from './alertmanagertypesChannelOpsgenieConfigDTODetails';

export interface AlertmanagertypesChannelOpsgenieConfigDTO {
	/**
	 * @type string
	 * @format password
	 * @description The Opsgenie API integration key. A secret; returned by create, update and fetch by ID, never by list.
	 */
	apiKey: string;
	/**
	 * @type string
	 * @description The Opsgenie API host; empty uses the global Alertmanager default.
	 */
	apiUrl?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the alert description; defaults to the Alertmanager Opsgenie default.
	 */
	description?: string;
	/**
	 * @type object,null
	 * @description Custom alert details keyed by name, each an Alertmanager template.
	 */
	details?: AlertmanagertypesChannelOpsgenieConfigDTODetails;
	/**
	 * @type string
	 * @description Alertmanager template for the alert message; defaults to the Alertmanager Opsgenie default.
	 */
	message?: string;
	/**
	 * @type string
	 * @description The alert priority, P1 to P5.
	 */
	priority?: string;
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to true.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @description Alertmanager template for the alert source; defaults to the Alertmanager Opsgenie default.
	 */
	source?: string;
}
