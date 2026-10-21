import type { DashboardtypesGeoMapLocationDTO } from 'api/generated/services/sigNoz.schemas';
import { normalizeCountry } from 'lib/visualization/charts/GeoMap/geo/normalizeCountry';
import { SUBDIVISION_COUNTRY_CODES } from 'lib/visualization/charts/GeoMap/geo/subdivisionCountries';
import type { PanelTable } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { detectLocationColumns, toText } from './prepareData';

const STATE_COUNTRIES = new Set<string>(SUBDIVISION_COUNTRY_CODES);
const ISO_3166_2 = /^([A-Za-z]{2})-[A-Za-z0-9]{1,3}$/;

/**
 * The country with states that most rows belong to: the prefix of codes like
 * `US-CA`, else the country column. Undefined when the rows name none.
 */
export function suggestCountry(
	table: PanelTable | undefined,
	location: DashboardtypesGeoMapLocationDTO | undefined,
): string | undefined {
	if (!table) {
		return undefined;
	}
	const groupIds = table.columns
		.filter((column) => !column.isValueColumn)
		.map((column) => column.id);
	const detected = detectLocationColumns(groupIds);
	const has = (id: string | undefined): string | undefined =>
		id && groupIds.includes(id) ? id : undefined;
	const region = has(location?.region) ?? detected.region;
	const country = has(location?.country) ?? detected.country;

	const counts = new Map<string, number>();
	table.rows.forEach((row) => {
		const code =
			ISO_3166_2.exec(region ? toText(row.data[region]) : '')?.[1].toUpperCase() ??
			(country ? normalizeCountry(toText(row.data[country])) : null);
		if (code && STATE_COUNTRIES.has(code)) {
			counts.set(code, (counts.get(code) ?? 0) + 1);
		}
	});
	return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
}
