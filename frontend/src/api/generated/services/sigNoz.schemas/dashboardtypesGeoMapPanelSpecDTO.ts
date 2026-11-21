/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesBasicVisualizationDTO } from './dashboardtypesBasicVisualizationDTO';
import type { DashboardtypesGeoMapChartAppearanceDTO } from './dashboardtypesGeoMapChartAppearanceDTO';
import type { DashboardtypesGeoMapLocationDTO } from './dashboardtypesGeoMapLocationDTO';
import type { DashboardtypesGeoMapSettingsDTO } from './dashboardtypesGeoMapSettingsDTO';
import type { DashboardtypesGeoMapThresholdDTO } from './dashboardtypesGeoMapThresholdDTO';
import type { DashboardtypesLegendDTO } from './dashboardtypesLegendDTO';
import type { DashboardtypesTableFormattingDTO } from './dashboardtypesTableFormattingDTO';

export interface DashboardtypesGeoMapPanelSpecDTO {
	/**
	 * @description Color scale, bubble size and labels.
	 */
	chartAppearance?: DashboardtypesGeoMapChartAppearanceDTO;
	/**
	 * @description Per-column units and decimal precision.
	 */
	formatting?: DashboardtypesTableFormattingDTO;
	/**
	 * @description Legend placement.
	 */
	legend?: DashboardtypesLegendDTO;
	/**
	 * @description The group-by columns that place each row on the map.
	 */
	location?: DashboardtypesGeoMapLocationDTO;
	/**
	 * @description Layer, view, projection and the value columns drawn.
	 */
	map?: DashboardtypesGeoMapSettingsDTO;
	/**
	 * @type array,null
	 * @description Rules that recolor a shape, bubble or point when its value compares to a threshold as specified.
	 */
	thresholds?: DashboardtypesGeoMapThresholdDTO[] | null;
	/**
	 * @description The time range the values are computed over.
	 */
	visualization?: DashboardtypesBasicVisualizationDTO;
}
