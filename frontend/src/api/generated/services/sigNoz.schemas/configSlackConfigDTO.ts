/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';
import type { ConfigSecretURLDTO } from './configSecretURLDTO';
import type { ConfigSlackActionDTO } from './configSlackActionDTO';
import type { ConfigSlackFieldDTO } from './configSlackFieldDTO';
import type { ConfigURLType2DTO } from './configURLType2DTO';
import type { TimeDurationDTO } from './timeDurationDTO';

export interface ConfigSlackConfigDTO {
	/**
	 * @type array
	 */
	actions?: ConfigSlackActionDTO[];
	api_url?: ConfigSecretURLDTO;
	/**
	 * @type string
	 */
	api_url_file?: string;
	/**
	 * @type string
	 */
	app_token?: string;
	/**
	 * @type string
	 */
	app_token_file?: string;
	app_url?: ConfigURLType2DTO;
	/**
	 * @type string
	 */
	callback_id?: string;
	/**
	 * @type string
	 */
	channel?: string;
	/**
	 * @type string
	 */
	color?: string;
	/**
	 * @type string
	 */
	fallback?: string;
	/**
	 * @type array
	 */
	fields?: ConfigSlackFieldDTO[];
	/**
	 * @type string
	 */
	footer?: string;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	icon_emoji?: string;
	/**
	 * @type string
	 */
	icon_url?: string;
	/**
	 * @type string
	 */
	image_url?: string;
	/**
	 * @type boolean
	 */
	link_names?: boolean;
	/**
	 * @type string
	 */
	message_text?: string;
	/**
	 * @type array
	 */
	mrkdwn_in?: string[];
	/**
	 * @type string
	 */
	pretext?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type boolean
	 */
	short_fields?: boolean;
	/**
	 * @type string
	 */
	text?: string;
	/**
	 * @type string
	 */
	thumb_url?: string;
	timeout?: TimeDurationDTO;
	/**
	 * @type string
	 */
	title?: string;
	/**
	 * @type string
	 */
	title_link?: string;
	/**
	 * @type string
	 */
	username?: string;
}
