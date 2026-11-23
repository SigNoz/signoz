/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { PreferencetypesValueDTO } from './preferencetypesValueDTO';

export interface PreferencetypesPreferenceDTO {
	/**
	 * @type array,null
	 */
	allowedScopes?: string[] | null;
	/**
	 * @type array,null
	 */
	allowedValues?: string[] | null;
	defaultValue?: PreferencetypesValueDTO;
	/**
	 * @type string
	 */
	description?: string;
	/**
	 * @type string
	 */
	name?: string;
	value?: PreferencetypesValueDTO;
	/**
	 * @type string
	 */
	valueType?: string;
}
