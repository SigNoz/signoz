/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface AlertmanagertypesChannelJSMOpsConfigDTO {
	/**
	 * @type string
	 * @format password
	 * @description The JSM Ops integration API key. A secret; returned by create, update and fetch by ID, never by list.
	 */
	apiKey: string;
	/**
	 * @type string
	 * @description Alertmanager template for the alert description; defaults to the SigNoz JSM Ops default.
	 */
	description?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the alert message; defaults to the SigNoz JSM Ops default.
	 */
	message?: string;
	/**
	 * @type string
	 * @description The alert priority, P1 to P5.
	 */
	priority?: string;
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to false.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @description Comma-separated tags attached to the alert; defaults to signoz.
	 */
	tags?: string;
}
