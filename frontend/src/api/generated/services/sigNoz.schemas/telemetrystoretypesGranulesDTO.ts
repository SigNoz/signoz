/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { TelemetrystoretypesMergeTreeReadDTO } from './telemetrystoretypesMergeTreeReadDTO';

/**
 * @nullable
 */
export type TelemetrystoretypesGranulesDTO = {
	/**
	 * @type integer
	 * @format int64
	 */
	initial: number;
	/**
	 * @type array
	 */
	reads: TelemetrystoretypesMergeTreeReadDTO[];
	/**
	 * @type integer
	 * @format int64
	 */
	selected: number;
	/**
	 * @type integer
	 * @format int64
	 */
	skipped: number;
} | null;
