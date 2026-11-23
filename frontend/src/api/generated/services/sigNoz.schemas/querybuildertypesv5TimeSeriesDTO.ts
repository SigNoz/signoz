/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { Querybuildertypesv5LabelDTO } from './querybuildertypesv5LabelDTO';
import type { Querybuildertypesv5TimeSeriesValueDTO } from './querybuildertypesv5TimeSeriesValueDTO';

export interface Querybuildertypesv5TimeSeriesDTO {
	/**
	 * @type array
	 * @description The group-by field values that identify this series.
	 */
	labels?: Querybuildertypesv5LabelDTO[];
	/**
	 * @type array,null
	 * @description The data points of the series in ascending timestamp order.
	 */
	values?: Querybuildertypesv5TimeSeriesValueDTO[] | null;
}
