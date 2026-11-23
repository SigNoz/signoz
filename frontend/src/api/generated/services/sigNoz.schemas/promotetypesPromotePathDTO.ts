/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { PromotetypesWrappedIndexDTO } from './promotetypesWrappedIndexDTO';

export interface PromotetypesPromotePathDTO {
	/**
	 * @type string
	 */
	context: string;
	/**
	 * @type array
	 */
	indexes?: PromotetypesWrappedIndexDTO[];
	/**
	 * @type string
	 */
	path: string;
	/**
	 * @type boolean
	 */
	promote?: boolean;
	/**
	 * @type string
	 */
	signal: string;
}
