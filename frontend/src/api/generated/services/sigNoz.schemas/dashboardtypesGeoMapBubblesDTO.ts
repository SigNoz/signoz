/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesGeoMapBubblesDTOMaxRadius } from './dashboardtypesGeoMapBubblesDTOMaxRadius';
import type { DashboardtypesGeoMapBubblesDTOMinRadius } from './dashboardtypesGeoMapBubblesDTOMinRadius';

export interface DashboardtypesGeoMapBubblesDTO {
	/**
	 * @description Radius of the largest circle, in CSS pixels from 1 to 64. Null means 8 on the points layer, 28 otherwise.
	 */
	maxRadius?: DashboardtypesGeoMapBubblesDTOMaxRadius;
	/**
	 * @description Radius of the smallest circle, in CSS pixels from 1 to 64. Null means 2 on the points layer, 3 otherwise.
	 */
	minRadius?: DashboardtypesGeoMapBubblesDTOMinRadius;
}
