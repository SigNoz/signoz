/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';
import type { ConfigMattermostAttachmentDTO } from './configMattermostAttachmentDTO';
import type { ConfigMattermostPriorityDTO } from './configMattermostPriorityDTO';
import type { ConfigMattermostPropsDTO } from './configMattermostPropsDTO';
import type { ConfigSecretURLDTO } from './configSecretURLDTO';

export interface ConfigMattermostConfigDTO {
	/**
	 * @type array
	 */
	attachments?: ConfigMattermostAttachmentDTO[];
	/**
	 * @type string
	 */
	channel?: string;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	icon_emoji?: string;
	/**
	 * @type string
	 */
	icon_url?: string;
	priority?: ConfigMattermostPriorityDTO;
	props?: ConfigMattermostPropsDTO;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	/**
	 * @type string
	 */
	text?: string;
	/**
	 * @type string
	 */
	type?: string;
	/**
	 * @type string
	 */
	username?: string;
	webhook_url?: ConfigSecretURLDTO;
	/**
	 * @type string
	 */
	webhook_url_file?: string;
}
