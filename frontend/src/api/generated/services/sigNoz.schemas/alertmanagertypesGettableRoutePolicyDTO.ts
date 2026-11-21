/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { AlertmanagertypesExpressionKindDTO } from './alertmanagertypesExpressionKindDTO';

export interface AlertmanagertypesGettableRoutePolicyDTO {
	/**
	 * @type array,null
	 */
	channels: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	createdAt: string;
	/**
	 * @type string,null
	 */
	createdBy?: string | null;
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	expression: string;
	/**
	 * @type string
	 */
	id: string;
	kind?: AlertmanagertypesExpressionKindDTO;
	/**
	 * @type string
	 */
	name: string;
	/**
	 * @type array,null
	 */
	tags?: string[] | null;
	/**
	 * @type string
	 * @format date-time
	 */
	updatedAt: string;
	/**
	 * @type string,null
	 */
	updatedBy?: string | null;
}
