/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface AlertmanagertypesChannelWebhookConfigDTO {
	/**
	 * @type string
	 * @format password
	 * @description The bearer token sent in the Authorization header; cannot be combined with username or password.
	 */
	bearerToken?: string;
	/**
	 * @type string
	 * @format password
	 * @description The basic auth password; cannot be combined with bearerToken.
	 */
	password?: string;
	/**
	 * @type boolean,null
	 * @description Also notify when the alert resolves. Defaults to true.
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 * @format password
	 * @description The endpoint that receives the Alertmanager webhook payload. A secret; returned by create, update and fetch by ID, never by list.
	 */
	url: string;
	/**
	 * @type string
	 * @description The basic auth user; cannot be combined with bearerToken.
	 */
	username?: string;
}
