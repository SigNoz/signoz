/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesExpressionKindDTO } from './alertmanagertypesExpressionKindDTO';

export interface AlertmanagertypesPostableRoutePolicyDTO {
	/**
	 * @type array,null
	 */
	channels: string[] | null;
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	expression: string;
	kind?: AlertmanagertypesExpressionKindDTO;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type array,null
	 */
	tags?: string[] | null;
}
