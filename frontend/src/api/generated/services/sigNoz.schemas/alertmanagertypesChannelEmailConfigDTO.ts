/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesChannelEmailConfigDTOHeaders } from './alertmanagertypesChannelEmailConfigDTOHeaders';

export interface AlertmanagertypesChannelEmailConfigDTO {
	/**
	 * @type object,null
	 * @description Extra SMTP headers keyed by canonical MIME header name, such as Subject.
	 */
	headers?: AlertmanagertypesChannelEmailConfigDTOHeaders;
	/**
	 * @type string
	 * @description Alertmanager template for the HTML body; defaults to the Alertmanager email default.
	 */
	html?: string;
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to false.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @description The recipient addresses, comma separated.
	 */
	to: string;
}
