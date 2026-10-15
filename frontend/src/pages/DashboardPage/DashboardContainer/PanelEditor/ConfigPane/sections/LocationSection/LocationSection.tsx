import { useRef } from 'react';
import {
	DashboardtypesGeoMapLayerDTO,
	DashboardtypesGeoMapViewDTO,
} from 'api/generated/services/sigNoz.schemas';
import { detectLocationColumns } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/prepareData';
import type {
	GeoMapPlacementSlice,
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import ConfigField from '../../controls/ConfigField/ConfigField';
import ConfigSelect from '../../controls/ConfigSelect/ConfigSelect';
import ConfigTiles from '../../controls/ConfigTiles/ConfigTiles';
import type { SectionEditorContext } from '../../sectionContext';
import { formatColumnOption } from '../DimensionsSection/utils';
import CountryFormatField from './CountryFormatField';
import { LOCATION_DRAWINGS } from './drawings';
import LocationColumns from './LocationColumns';
import PlacementStatus from './PlacementStatus';
import RowKindField from './RowKindField';
import {
	autoColumnFor,
	buildAreaItems,
	changeRowKind,
	describeKind,
	describeLayer,
	describePlacement,
	describeUnplaced,
	fromAreaValue,
	isAutoMode,
	type LocationField,
	resolveLayer,
	resolveRowKind,
	type RowKind,
	STATE_COUNTRY_OPTIONS,
	toAreaValue,
} from './utils';
import ValueColumnsFields from './ValueColumnsFields';

import styles from './LocationSection.module.scss';

type LocationSectionProps = SectionEditorProps<SectionKind.Location> &
	Pick<
		SectionEditorContext,
		'groupColumns' | 'tableColumns' | 'geoMapPlacement'
	>;

const LAYER = DashboardtypesGeoMapLayerDTO;

const SUGGESTED_KEYS = [
	'geo.country.iso_code',
	'geo.region.iso_code',
	'geo.location.lat + lon',
];

/**
 * Edits `location` and `map` together, in the order a user decides: what each
 * row is, which column holds it, the area, how it draws, and what color and
 * size show. Choices that can't draw together aren't offered.
 */
function LocationSection({
	value,
	onChange,
	groupColumns = [],
	tableColumns = [],
	geoMapPlacement,
}: LocationSectionProps): JSX.Element {
	const previousView = useRef<DashboardtypesGeoMapViewDTO>();
	const data = geoMapPlacement?.data;
	const kind = resolveRowKind(value, data);
	const isAuto = isAutoMode(value);
	const layer = resolveLayer(value, kind);
	const hasGroupBy = groupColumns.length > 0;
	const viewCountry = value?.map?.viewCountry;
	const detected = detectLocationColumns(groupColumns);
	const autoColumn = (field: LocationField): string | undefined =>
		autoColumnFor(field, data?.location, detected);

	const setLocation = (patch: GeoMapPlacementSlice['location']): void =>
		onChange({ ...value, location: { ...value?.location, ...patch } });
	const setMap = (patch: GeoMapPlacementSlice['map']): void =>
		onChange({ ...value, map: { ...value?.map, ...patch } });
	const pickKind = (to: RowKind | 'auto'): void => {
		const change = changeRowKind(value, kind, to, {
			previousView: previousView.current,
			suggestedCountry: geoMapPlacement?.suggestedCountry,
		});
		if (change.previousView) {
			previousView.current = change.previousView;
		}
		onChange(change.next);
	};
	const status = data && describePlacement(data, kind, viewCountry);

	return (
		<div className={styles.section}>
			<RowKindField
				kind={kind}
				isAuto={isAuto}
				help={describeKind({ hasGroupBy, kind, isAuto, autoColumn })}
				onPick={pickKind}
			/>

			{!hasGroupBy && (
				<div className={styles.empty} data-testid="geo-location-empty">
					<span className={styles.emptyTitle}>Add a location to Group By</span>
					<span className={styles.muted}>
						The query has no group-by yet, so there is nothing to place. Group by one
						of these attributes in the query below and run it. This section fills in
						by itself.
					</span>
					<div className={styles.chips}>
						{SUGGESTED_KEYS.map((key) => (
							<span key={key} className={styles.chip}>
								{key}
							</span>
						))}
					</div>
				</div>
			)}

			{kind === 'state' && (
				<ConfigField
					label="States of"
					help={
						viewCountry ? (
							'The map zooms to this country.'
						) : (
							<span className={styles.error}>
								States only draw inside one country. Pick the country.
							</span>
						)
					}
				>
					<ConfigSelect
						testId="panel-editor-v2-geo-location-view-country"
						showSearch
						placeholder="Pick a country"
						value={viewCountry || undefined}
						items={STATE_COUNTRY_OPTIONS}
						onChange={(next): void => setMap({ viewCountry: next })}
					/>
				</ConfigField>
			)}

			{hasGroupBy && kind && (
				<LocationColumns
					kind={kind}
					location={value?.location}
					groupColumns={groupColumns}
					autoColumn={autoColumn}
					onChange={setLocation}
				/>
			)}

			{status && data && (
				<PlacementStatus
					status={status}
					unplaced={describeUnplaced(data, kind, viewCountry)}
				/>
			)}

			{hasGroupBy && kind === 'country' && (
				<CountryFormatField
					value={value?.location?.countryFormat}
					onChange={(countryFormat): void => setLocation({ countryFormat })}
				/>
			)}

			{kind !== 'state' && (
				<ConfigField
					label="Map area"
					changed={toAreaValue(value) !== DashboardtypesGeoMapViewDTO.world}
					onReset={(): void =>
						setMap({ view: DashboardtypesGeoMapViewDTO.world, viewCountry: '' })
					}
					help={
						value?.map?.view === DashboardtypesGeoMapViewDTO.fit
							? 'Zooms to the places in the results.'
							: undefined
					}
				>
					<ConfigSelect
						testId="panel-editor-v2-geo-map-view"
						showSearch={kind === 'point'}
						value={toAreaValue(value)}
						items={buildAreaItems(kind)}
						onChange={(next): void => setMap(fromAreaValue(next))}
					/>
				</ConfigField>
			)}

			<ConfigField
				label="Draw as"
				changed={kind !== 'point' && layer !== LAYER.regions}
				onReset={(): void => setMap({ layer: LAYER.regions })}
				help={describeLayer(kind, layer)}
			>
				<ConfigTiles<DashboardtypesGeoMapLayerDTO>
					testId="panel-editor-v2-geo-map-layer"
					aria-label="Draw as"
					value={layer}
					items={[
						{
							value: LAYER.regions,
							label: 'Shaded areas',
							drawing: LOCATION_DRAWINGS.regions,
							disabled: kind === 'point',
						},
						{
							value: LAYER.bubbles,
							label: 'Bubbles',
							drawing: LOCATION_DRAWINGS.bubbles,
							disabled: kind === 'point',
						},
						{
							value: LAYER.points,
							label: 'Points',
							drawing: LOCATION_DRAWINGS.points,
						},
					]}
					onChange={(next): void =>
						next === LAYER.points ? pickKind('point') : setMap({ layer: next })
					}
				/>
			</ConfigField>

			<ValueColumnsFields
				layer={layer}
				valueItems={tableColumns.map((column) => ({
					value: column.key,
					label: formatColumnOption(column),
				}))}
				colorBy={value?.map?.colorBy}
				sizeBy={value?.map?.sizeBy}
				onChange={setMap}
			/>
		</div>
	);
}

export default LocationSection;
