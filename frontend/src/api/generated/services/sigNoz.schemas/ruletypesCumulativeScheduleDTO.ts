/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { RuletypesScheduleTypeDTO } from './ruletypesScheduleTypeDTO';

export interface RuletypesCumulativeScheduleDTO {
	/**
	 * @type integer,null
	 * @description The day of the month of the reset boundary, 1 to 31. Required for monthly.
	 */
	day?: number | null;
	/**
	 * @type integer,null
	 * @description The hour of the reset boundary, 0 to 23. Required for daily, weekly and monthly.
	 */
	hour?: number | null;
	/**
	 * @type integer,null
	 * @description The minute of the reset boundary, 0 to 59. Required for every type.
	 */
	minute?: number | null;
	/**
	 * @description How often the window resets: hourly, daily, weekly or monthly.
	 */
	type: RuletypesScheduleTypeDTO;
	/**
	 * @type integer,null
	 * @description The weekday of the reset boundary, 0 (Sunday) to 6 (Saturday). Required for weekly.
	 */
	weekday?: number | null;
}
