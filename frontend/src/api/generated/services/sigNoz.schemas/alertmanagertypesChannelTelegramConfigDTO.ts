/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface AlertmanagertypesChannelTelegramConfigDTO {
	/**
	 * @type string
	 */
	apiUrl?: string;
	/**
	 * @type string
	 * @format password
	 */
	botToken: string;
	/**
	 * @type integer
	 * @format int64
	 */
	chatId: number;
	/**
	 * @type boolean
	 */
	disableNotifications?: boolean;
	/**
	 * @type string
	 */
	message?: string;
	/**
	 * @type integer
	 */
	messageThreadId?: number;
	/**
	 * @type boolean,null
	 */
	sendResolved?: boolean | null;
	/**
	 * @type string
	 */
	title?: string;
}
