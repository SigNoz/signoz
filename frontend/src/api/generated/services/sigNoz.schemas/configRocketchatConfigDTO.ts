/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';
import type { ConfigRocketchatAttachmentActionDTO } from './configRocketchatAttachmentActionDTO';
import type { ConfigRocketchatAttachmentFieldDTO } from './configRocketchatAttachmentFieldDTO';
import type { ConfigURLType2DTO } from './configURLType2DTO';

export interface ConfigRocketchatConfigDTO {
	/**
	 * @type array
	 */
	actions?: ConfigRocketchatAttachmentActionDTO[];
	api_url?: ConfigURLType2DTO;
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
	emoji?: string;
	/**
	 * @type array
	 */
	fields?: ConfigRocketchatAttachmentFieldDTO[];
	http_config?: ConfigHTTPClientConfigDTO;
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
	token?: string;
	/**
	 * @type string
	 */
	token_file?: string;
	/**
	 * @type string
	 */
	token_id?: string;
	/**
	 * @type string
	 */
	token_id_file?: string;
}
