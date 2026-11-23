/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface AlertmanagertypesChannelGoogleChatConfigDTO {
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to false.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @description Alertmanager template for the message body; defaults to the SigNoz Google Chat default.
	 */
	text?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the message title; defaults to the SigNoz Google Chat default.
	 */
	title?: string;
	/**
	 * @type string
	 * @format password
	 * @description The Google Chat space webhook URL. A secret; returned by create, update and fetch by ID, never by list.
	 */
	webhookUrl: string;
}
