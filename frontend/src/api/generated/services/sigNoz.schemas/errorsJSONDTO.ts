/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { ErrorsResponseerroradditionalDTO } from './errorsResponseerroradditionalDTO';
import type { ErrorsResponseretryjsonDTO } from './errorsResponseretryjsonDTO';

export interface ErrorsJSONDTO {
	/**
	 * @type string
	 */
	code: string;
	/**
	 * @type array
	 */
	errors: ErrorsResponseerroradditionalDTO[];
	/**
	 * @type string
	 */
	message: string;
	retry?: ErrorsResponseretryjsonDTO;
	/**
	 * @type array
	 */
	suggestions: string[];
	/**
	 * @type string
	 */
	type: string;
	/**
	 * @type string
	 */
	url?: string;
}
