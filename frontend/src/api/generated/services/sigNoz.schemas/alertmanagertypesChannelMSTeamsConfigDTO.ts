/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface AlertmanagertypesChannelMSTeamsConfigDTO {
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to true.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @description Alertmanager template for the card body; defaults to the Alertmanager Teams default.
	 */
	text?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the card title; defaults to the Alertmanager Teams default.
	 */
	title?: string;
	/**
	 * @type string
	 * @format password
	 * @description The Teams incoming webhook URL. A secret; returned by create, update and fetch by ID, never by list.
	 */
	webhookUrl: string;
}
