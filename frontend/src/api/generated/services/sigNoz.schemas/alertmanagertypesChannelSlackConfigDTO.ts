/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesChannelSlackActionDTO } from './alertmanagertypesChannelSlackActionDTO';
import type { AlertmanagertypesChannelSlackFieldDTO } from './alertmanagertypesChannelSlackFieldDTO';

export interface AlertmanagertypesChannelSlackConfigDTO {
	/**
	 * @type array,null
	 * @description Attachment buttons; each requires type and text plus url or name.
	 */
	actions?: AlertmanagertypesChannelSlackActionDTO[] | null;
	/**
	 * @type string
	 * @format password
	 * @description The Slack incoming webhook URL. A secret; returned by create, update and fetch by ID, never by list.
	 */
	apiUrl: string;
	/**
	 * @type string
	 * @description The channel or user to post to, such as #alerts; empty uses the webhook default.
	 */
	channel?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the attachment color; defaults to the Alertmanager Slack default.
	 */
	color?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the plain-text summary shown where attachments cannot render; defaults to the Alertmanager Slack default.
	 */
	fallback?: string;
	/**
	 * @type array,null
	 * @description Attachment fields appended to the message; each requires title and value.
	 */
	fields?: AlertmanagertypesChannelSlackFieldDTO[] | null;
	/**
	 * @type string
	 * @description Alertmanager template for the attachment footer; defaults to the Alertmanager Slack default.
	 */
	footer?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the text shown above the attachment; defaults to the Alertmanager Slack default.
	 */
	pretext?: string;
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to false.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @description Alertmanager template for the message body; defaults to the Alertmanager Slack default.
	 */
	text?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the message title; defaults to the Alertmanager Slack default.
	 */
	title?: string;
	/**
	 * @type string
	 * @description Alertmanager template for the link the title opens; defaults to the Alertmanager Slack default.
	 */
	titleLink?: string;
}
