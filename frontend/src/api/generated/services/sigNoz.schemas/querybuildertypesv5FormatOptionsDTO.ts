/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface Querybuildertypesv5FormatOptionsDTO {
	/**
	 * @type boolean
	 * @description When true, every builder query and formula in a time_series result gets a zero value for each missing step, whatever its aggregation, so averages and percentiles read as zero where no data exists. PromQL and ClickHouse SQL queries keep their gaps. Defaults to false.
	 */
	fillGaps?: boolean;
	/**
	 * @type boolean
	 * @description When true, scalar results from several queries are merged into one table keyed by their group-by columns. Defaults to false.
	 */
	formatTableResultForUI?: boolean;
}
