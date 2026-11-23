/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { InframonitoringtypesHostFilterDTO } from './inframonitoringtypesHostFilterDTO';
import type { Querybuildertypesv5GroupByKeyDTO } from './querybuildertypesv5GroupByKeyDTO';
import type { Querybuildertypesv5OrderByDTO } from './querybuildertypesv5OrderByDTO';

export interface InframonitoringtypesPostableHostsDTO {
	/**
	 * @type integer
	 * @format int64
	 */
	end: number;
	filter?: InframonitoringtypesHostFilterDTO;
	/**
	 * @type array,null
	 */
	groupBy?: Querybuildertypesv5GroupByKeyDTO[] | null;
	/**
	 * @type integer
	 */
	limit: number;
	/**
	 * @type integer
	 */
	offset?: number;
	orderBy?: Querybuildertypesv5OrderByDTO;
	/**
	 * @type integer
	 * @format int64
	 */
	start: number;
}
