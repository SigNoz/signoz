/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */

export interface Querybuildertypesv5ClickHouseQueryDTO {
	/**
	 * @type boolean
	 * @description When true, the result is excluded from the response but the query may still run. Defaults to false.
	 */
	disabled?: boolean;
	/**
	 * @type string
	 * @description The display name template for each series; {{column}} placeholders are replaced by result column values.
	 */
	legend?: string;
	/**
	 * @type string
	 * @description The unique name of the query, such as A.
	 */
	name?: string;
	/**
	 * @type string
	 * @description The ClickHouse SQL statement. Reserved time placeholders such as {{.start_timestamp}}, {{.end_timestamp}}, {{.start_timestamp_ms}} and {{.start_datetime}} and dashboard variables written as {{name}}, [[name]] or $name are substituted before execution.
	 */
	query?: string;
}
