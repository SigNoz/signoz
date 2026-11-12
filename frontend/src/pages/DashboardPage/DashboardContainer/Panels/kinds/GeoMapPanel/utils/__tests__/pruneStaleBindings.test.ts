import {
	DashboardtypesGeoMapCountryFormatDTO,
	DashboardtypesGeoMapLayerDTO,
	type DashboardtypesGeoMapLocationDTO,
	DashboardtypesGeoMapLocationModeDTO,
	type DashboardtypesGeoMapPanelSpecDTO,
	DashboardtypesGeoMapProjectionDTO,
	type DashboardtypesGeoMapSettingsDTO,
	DashboardtypesGeoMapViewDTO,
	type DashboardtypesPanelSpecDTO,
} from 'api/generated/services/sigNoz.schemas';

import { pruneStaleBindings } from '../pruneStaleBindings';

function panelSpec(
	envelopes: unknown[],
	{ location, map }: DashboardtypesGeoMapPanelSpecDTO,
	kind = 'signoz/GeoMapPanel',
): DashboardtypesPanelSpecDTO {
	return {
		display: { name: 'p' },
		plugin: { kind, spec: { location, map } },
		queries: [
			{
				spec: {
					plugin: { kind: 'signoz/CompositeQuery', spec: { queries: envelopes } },
				},
			},
		],
	} as unknown as DashboardtypesPanelSpecDTO;
}

const builderQuery = (name: string, groupBy: string[]): unknown => ({
	type: 'builder_query',
	spec: {
		name,
		signal: 'logs',
		aggregations: [{ expression: 'count()' }],
		groupBy: groupBy.map((label) => ({ name: label })),
	},
});

const locationOf = (
	location: Partial<DashboardtypesGeoMapLocationDTO>,
): DashboardtypesGeoMapLocationDTO => ({
	mode: DashboardtypesGeoMapLocationModeDTO.auto,
	countryFormat: DashboardtypesGeoMapCountryFormatDTO.auto,
	...location,
});

const mapOf = (
	settings: Partial<DashboardtypesGeoMapSettingsDTO>,
): DashboardtypesGeoMapSettingsDTO => ({
	layer: DashboardtypesGeoMapLayerDTO.bubbles,
	view: DashboardtypesGeoMapViewDTO.world,
	projection: DashboardtypesGeoMapProjectionDTO.mercator,
	...settings,
});

const geoSpecOf = (
	spec: DashboardtypesPanelSpecDTO,
): DashboardtypesGeoMapPanelSpecDTO =>
	spec.plugin.spec as DashboardtypesGeoMapPanelSpecDTO;

const REGION_QUERIES = [
	builderQuery('A', ['geo.country.iso_code', 'geo.region.iso_code']),
	builderQuery('B', ['geo.country.iso_code', 'geo.region.iso_code']),
];

describe('pruneStaleBindings', () => {
	it('keeps the spec when every binding is a column of the queries', () => {
		const spec = panelSpec(REGION_QUERIES, {
			location: locationOf({
				mode: DashboardtypesGeoMapLocationModeDTO.subdivision,
				country: 'geo.country.iso_code',
				region: 'geo.region.iso_code',
			}),
			map: mapOf({ colorBy: 'A', sizeBy: 'B' }),
		});
		expect(pruneStaleBindings(spec)).toBe(spec);
	});

	it('clears a location key and a value the queries no longer produce', () => {
		const spec = panelSpec([builderQuery('A', ['geo.country.iso_code'])], {
			location: locationOf({
				country: 'geo.country.iso_code',
				region: 'geo.region.iso_code',
			}),
			map: mapOf({ colorBy: 'A', sizeBy: 'B' }),
		});
		const { location, map } = geoSpecOf(pruneStaleBindings(spec));
		expect(location?.country).toBe('geo.country.iso_code');
		expect(location?.region).toBe('');
		expect(map?.colorBy).toBe('A');
		expect(map?.sizeBy).toBe('');
	});

	it('clears location keys the picked row kind does not read', () => {
		const spec = panelSpec(
			[
				builderQuery('A', [
					'geo.country.iso_code',
					'geo.location.lat',
					'geo.location.lon',
				]),
			],
			{
				location: locationOf({
					mode: DashboardtypesGeoMapLocationModeDTO.country,
					country: 'geo.country.iso_code',
					lat: 'geo.location.lat',
					lon: 'geo.location.lon',
				}),
			},
		);
		expect(geoSpecOf(pruneStaleBindings(spec)).location).toStrictEqual(
			locationOf({
				mode: DashboardtypesGeoMapLocationModeDTO.country,
				country: 'geo.country.iso_code',
				lat: '',
				lon: '',
			}),
		);
	});

	it('keeps columns known only at run time but still clears unused keys', () => {
		const spec = panelSpec(
			[{ type: 'clickhouse_sql', spec: { name: 'A', query: 'SELECT 1' } }],
			{
				location: locationOf({
					mode: DashboardtypesGeoMapLocationModeDTO.coordinates,
					country: 'country',
					lat: 'lat',
					lon: 'lon',
				}),
				map: mapOf({ colorBy: 'value' }),
			},
		);
		const { location, map } = geoSpecOf(pruneStaleBindings(spec));
		expect([location?.country, location?.lat, location?.lon]).toStrictEqual([
			'',
			'lat',
			'lon',
		]);
		expect(map?.colorBy).toBe('value');
	});

	it('leaves other panel kinds untouched', () => {
		const spec = panelSpec(
			[builderQuery('A', [])],
			{ map: mapOf({ sizeBy: 'B' }) },
			'signoz/TablePanel',
		);
		expect(pruneStaleBindings(spec)).toBe(spec);
	});
});
