/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { RuletypesAlertStateDTO } from './ruletypesAlertStateDTO';

export interface RulestatehistorytypesGettableRuleStateWindowDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end: number;
	/**
	 * @type integer
	 * @format int64
	 */
	start: number;
	state: RuletypesAlertStateDTO;
}
