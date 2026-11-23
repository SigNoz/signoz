/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';
import type { ConfigURLType2DTO } from './configURLType2DTO';

export interface AlertmanagertypesTelegramReceiverConfigDTO {
	api_url?: ConfigURLType2DTO;
	/**
	 * @type integer
	 * @format int64
	 */
	chat?: number;
	/**
	 * @type string
	 */
	chat_file?: string;
	/**
	 * @type boolean
	 */
	disable_notifications?: boolean;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	message?: string;
	/**
	 * @type integer
	 */
	message_thread_id?: number;
	/**
	 * @type string
	 */
	parse_mode?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	title?: string;
	/**
	 * @type string
	 */
	token?: string;
	/**
	 * @type string
	 */
	token_file?: string;
}
