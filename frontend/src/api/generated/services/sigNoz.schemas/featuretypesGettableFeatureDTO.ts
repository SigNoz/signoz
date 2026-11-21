/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { FeaturetypesGettableFeatureDTOVariants } from './featuretypesGettableFeatureDTOVariants';

export interface FeaturetypesGettableFeatureDTO {
	/**
	 * @type string
	 */
	defaultVariant?: string;
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	kind?: string;
	/**
	 * @type string
	 */
	name?: string;
	resolvedValue?: unknown;
	/**
	 * @type string
	 */
	stage?: string;
	/**
	 * @type object,null
	 */
	variants?: FeaturetypesGettableFeatureDTOVariants;
}
