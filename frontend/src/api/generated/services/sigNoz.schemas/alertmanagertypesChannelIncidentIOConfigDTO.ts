/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesChannelIncidentIOConfigDTOMetadata } from './alertmanagertypesChannelIncidentIOConfigDTOMetadata';

export interface AlertmanagertypesChannelIncidentIOConfigDTO {
	/**
	 * @type string
	 * @description Alertmanager template for the alert description, rendered as markdown; defaults to the SigNoz incident.io default.
	 */
	description?: string;
	/**
	 * @type object,null
	 * @description Extra event metadata keyed by name, merged over the group's common labels; values are Alertmanager templates.
	 */
	metadata?: AlertmanagertypesChannelIncidentIOConfigDTOMetadata;
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to false.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @description Alertmanager template for the alert title; defaults to the SigNoz incident.io default.
	 */
	title?: string;
	/**
	 * @type string
	 * @format password
	 * @description The alert source secret token, without the Bearer prefix. A secret; returned by create, update and fetch by ID, never by list.
	 */
	token: string;
	/**
	 * @type string
	 * @description The alert source HTTP alert events endpoint copied from its setup page.
	 */
	url: string;
}
