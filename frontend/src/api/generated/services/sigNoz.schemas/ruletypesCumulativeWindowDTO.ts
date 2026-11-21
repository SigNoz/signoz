/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { RuletypesCumulativeScheduleDTO } from './ruletypesCumulativeScheduleDTO';

export interface RuletypesCumulativeWindowDTO {
	/**
	 * @type string
	 * @description How often the rule is evaluated, as a Go duration such as 1m. Must be positive.
	 */
	frequency: string;
	/**
	 * @description The boundary the accumulation window starts from. Each evaluation queries from the most recent boundary to now.
	 */
	schedule: RuletypesCumulativeScheduleDTO;
	/**
	 * @type string
	 * @description The IANA time zone the schedule is resolved in, such as UTC or Asia/Kolkata.
	 */
	timezone: string;
}
