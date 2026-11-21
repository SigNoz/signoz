/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesGeoMapBubblesDTO } from './dashboardtypesGeoMapBubblesDTO';
import type { DashboardtypesGeoMapColorsDTO } from './dashboardtypesGeoMapColorsDTO';

export interface DashboardtypesGeoMapChartAppearanceDTO {
	/**
	 * @description The circle radius range of the bubbles and points layers.
	 */
	bubbles?: DashboardtypesGeoMapBubblesDTO;
	/**
	 * @description The color scale applied to the colorBy values.
	 */
	colors?: DashboardtypesGeoMapColorsDTO;
	/**
	 * @type boolean,null
	 * @description Shows country and state names once each fits inside its shape. Null shows them.
	 */
	labels?: boolean | null;
}
