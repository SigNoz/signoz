/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { GlobaltypesIdentNConfigDTO } from './globaltypesIdentNConfigDTO';

export interface GlobaltypesConfigDTO {
	/**
	 * @type string,null
	 */
	ai_assistant_url: string | null;
	/**
	 * @type string
	 */
	external_url: string;
	identN?: GlobaltypesIdentNConfigDTO;
	/**
	 * @type string
	 */
	ingestion_url: string;
	/**
	 * @type string,null
	 */
	mcp_url: string | null;
}
