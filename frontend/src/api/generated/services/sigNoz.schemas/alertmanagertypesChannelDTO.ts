/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface AlertmanagertypesChannelDTO {
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt?: string;
	/**
	 * @type string
	 * @description The channel configuration as a JSON document.
	 */
	data: string;
	/**
	 * @type string
	 */
	id: string;
	/**
	 * @type string
	 * @description The channel name. Alert rules and routing policies reference it.
	 */
	name: string;
	/**
	 * @type string
	 * @description The organization the channel belongs to.
	 */
	orgId: string;
	/**
	 * @type string
	 * @description The channel kind, such as slack.
	 */
	type: string;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt?: string;
}
