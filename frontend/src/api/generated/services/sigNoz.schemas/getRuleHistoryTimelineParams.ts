/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5OrderDirectionDTO } from './querybuildertypesv5OrderDirectionDTO';
import type { RuletypesAlertStateDTO } from './ruletypesAlertStateDTO';

export type GetRuleHistoryTimelineParams = {
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	start: number;
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	end: number;
	/**
	 * @description undefined
	 */
	state?: RuletypesAlertStateDTO;
	/**
	 * @type string
	 * @description undefined
	 */
	filterExpression?: string;
	/**
	 * @type integer
	 * @format int64
	 * @description undefined
	 */
	limit?: number;
	/**
	 * @description undefined
	 */
	order?: Querybuildertypesv5OrderDirectionDTO;
	/**
	 * @type string
	 * @description undefined
	 */
	cursor?: string;
};
