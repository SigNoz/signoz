/**
 * ! Do not edit manually
 * * The file has been auto-generated using Orval for SigNoz
 * * regenerate with 'pnpm generate:api'
 * SigNoz
 */
import type { DashboardtypesGeoMapCountryFormatDTO } from './dashboardtypesGeoMapCountryFormatDTO';
import type { DashboardtypesGeoMapLocationModeDTO } from './dashboardtypesGeoMapLocationModeDTO';

export interface DashboardtypesGeoMapLocationDTO {
	/**
	 * @type string
	 * @description Group-by key holding the country, for the country and subdivision modes. Empty detects it by name, such as geo.country.iso_code.
	 */
	country?: string;
	/**
	 * @description How country values are written: auto (default) detects it, alpha2, alpha3 or name.
	 */
	countryFormat: DashboardtypesGeoMapCountryFormatDTO;
	/**
	 * @type string
	 * @description Group-by key holding the latitude, for the coordinates mode. Empty detects it by name.
	 */
	lat?: string;
	/**
	 * @type string
	 * @description Group-by key holding the longitude, for the coordinates mode. Empty detects it by name.
	 */
	lon?: string;
	/**
	 * @description How rows are placed: auto (default) detects it from the group-by keys, country, subdivision or coordinates.
	 */
	mode: DashboardtypesGeoMapLocationModeDTO;
	/**
	 * @type string
	 * @description Group-by key holding the ISO 3166-2 region code (e.g. geo.region.iso_code), for the subdivision mode. Empty detects it by name.
	 */
	region?: string;
}
