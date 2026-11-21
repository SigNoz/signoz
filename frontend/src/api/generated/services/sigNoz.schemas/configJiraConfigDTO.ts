/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ConfigHTTPClientConfigDTO } from './configHTTPClientConfigDTO';
import type { ConfigJiraConfigDTOCustomFields } from './configJiraConfigDTOCustomFields';
import type { ConfigJiraFieldConfigDTO } from './configJiraFieldConfigDTO';
import type { ConfigURLType2DTO } from './configURLType2DTO';
import type { ModelDurationDTO } from './modelDurationDTO';

export interface ConfigJiraConfigDTO {
	/**
	 * @type string
	 */
	api_type?: string;
	api_url?: ConfigURLType2DTO;
	/**
	 * @type object
	 */
	custom_fields?: ConfigJiraConfigDTOCustomFields;
	description?: ConfigJiraFieldConfigDTO;
	http_config?: ConfigHTTPClientConfigDTO;
	/**
	 * @type string
	 */
	issue_type?: string;
	/**
	 * @type array
	 */
	labels?: string[];
	/**
	 * @type string
	 */
	priority?: string;
	/**
	 * @type string
	 */
	project?: string;
	reopen_duration?: ModelDurationDTO;
	/**
	 * @type string
	 */
	reopen_transition?: string;
	/**
	 * @type string
	 */
	resolve_transition?: string;
	/**
	 * @type boolean
	 */
	send_resolved?: boolean;
	summary?: ConfigJiraFieldConfigDTO;
	/**
	 * @type string
	 */
	wont_fix_resolution?: string;
}
