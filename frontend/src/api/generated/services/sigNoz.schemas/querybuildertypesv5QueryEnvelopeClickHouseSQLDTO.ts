/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5ClickHouseQueryDTO } from './querybuildertypesv5ClickHouseQueryDTO';
import type { Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType } from './querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType';

export interface Querybuildertypesv5QueryEnvelopeClickHouseSQLDTO {
	/**
	 * @description The ClickHouse SQL query specification.
	 */
	spec?: Querybuildertypesv5ClickHouseQueryDTO;
	/**
	 * @type string
	 * @enum clickhouse_sql
	 * @description The type of the query.
	 */
	type: Querybuildertypesv5QueryEnvelopeClickHouseSQLDTOType;
}
