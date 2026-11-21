/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesGeoMapLayerDTO } from './dashboardtypesGeoMapLayerDTO';
import type { DashboardtypesGeoMapProjectionDTO } from './dashboardtypesGeoMapProjectionDTO';
import type { DashboardtypesGeoMapViewDTO } from './dashboardtypesGeoMapViewDTO';

export interface DashboardtypesGeoMapSettingsDTO {
	/**
	 * @type string
	 * @description Value column key, as in a Table panel, that sets the color. Empty uses the first value column.
	 */
	colorBy?: string;
	/**
	 * @description What is drawn: regions (default) fills each shape, bubbles draws a circle per region, points a circle per coordinate.
	 */
	layer: DashboardtypesGeoMapLayerDTO;
	/**
	 * @description The map projection: mercator (default), equal_earth or natural_earth.
	 */
	projection: DashboardtypesGeoMapProjectionDTO;
	/**
	 * @type string
	 * @description Value column key, as in a Table panel, that sets the bubble or point size. Empty uses colorBy.
	 */
	sizeBy?: string;
	/**
	 * @description The area shown: world (default), fit to the data, a continent, or country with viewCountry.
	 */
	view: DashboardtypesGeoMapViewDTO;
	/**
	 * @type string
	 * @description Uppercase ISO 3166-1 alpha-2 code of the country the country view shows.
	 */
	viewCountry?: string;
}
