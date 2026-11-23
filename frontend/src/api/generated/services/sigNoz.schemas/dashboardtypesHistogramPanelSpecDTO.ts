/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesHistogramBucketsDTO } from './dashboardtypesHistogramBucketsDTO';
import type { DashboardtypesLegendDTO } from './dashboardtypesLegendDTO';

export interface DashboardtypesHistogramPanelSpecDTO {
	/**
	 * @description How values are grouped into buckets.
	 */
	histogramBuckets?: DashboardtypesHistogramBucketsDTO;
	/**
	 * @description Legend placement and series colors.
	 */
	legend?: DashboardtypesLegendDTO;
}
