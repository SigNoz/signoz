import {
	DashboardtypesGeoMapProjectionDTO,
	type DashboardtypesGeoMapLocationDTO,
	type DashboardtypesGeoMapSettingsDTO,
} from 'api/generated/services/sigNoz.schemas';
import { detectLocationColumns } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/utils/locationColumns';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import type { SectionEditorContext } from '../../sectionContext';
import { formatColumnOption } from '../DimensionsSection/utils';
import CountryFormatField from './components/CountryFormatField';
import DrawAsField from './components/DrawAsField';
import GroupByEmptyState from './components/GroupByEmptyState';
import LocationColumns from './components/LocationColumns';
import MapAreaField from './components/MapAreaField';
import PlacementStatus from './components/PlacementStatus';
import PointsRequirement from './components/PointsRequirement';
import ProjectionField from './components/ProjectionField';
import RowKindField from './components/RowKindField';
import StatesOfField from './components/StatesOfField';
import ValueColumnsFields from './components/ValueColumnsFields';
import { useAddGroupBy } from './hooks/useAddGroupBy';
import { useRowKindSwitch } from './hooks/useRowKindSwitch';
import type { LocationField } from './types';
import { autoColumnFor, describeKind } from './utils/descriptions';
import { describePlacement, describeUnplaced } from './utils/placement';
import {
	isAutoMode,
	patchLocation,
	patchMap,
	resolveLayer,
	resolveRowKind,
} from './utils/rowKind';

import styles from './LocationSection.module.scss';

type LocationSectionProps = SectionEditorProps<SectionKind.Location> &
	Pick<
		SectionEditorContext,
		'groupColumns' | 'tableColumns' | 'geoMapPlacement'
	>;

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
	const addGroupBy = useAddGroupBy();
	const data = geoMapPlacement?.data;
	const kind = resolveRowKind(value, data);
	const isAuto = isAutoMode(value);
	const layer = resolveLayer(value, kind);
	const hasGroupBy = groupColumns.length > 0;
	const viewCountry = value?.map?.viewCountry;
	const detected = detectLocationColumns(groupColumns);
	const autoColumn = (field: LocationField): string | undefined =>
		autoColumnFor(field, data?.location, detected);
	const { pickKind, areaColumn, restoreAreas } = useRowKindSwitch({
		value,
		onChange,
		kind,
		isAuto,
		layer,
		detected,
		suggestedCountry: geoMapPlacement?.suggestedCountry,
	});

	const setLocation = (patch: Partial<DashboardtypesGeoMapLocationDTO>): void =>
		onChange({ ...value, location: patchLocation(value?.location, patch) });
	const setMap = (patch: Partial<DashboardtypesGeoMapSettingsDTO>): void =>
		onChange({ ...value, map: patchMap(value?.map, { layer, ...patch }) });
	const missingCoordinates = (['lat', 'lon'] as const).filter(
		(field) => !(value?.location?.[field] || autoColumn(field)),
	);
	const status = data && describePlacement(data, kind, viewCountry);

	return (
		<div className={styles.section}>
			<RowKindField
				kind={kind}
				isAuto={isAuto}
				help={describeKind({ hasGroupBy, kind, isAuto, autoColumn })}
				onPick={pickKind}
			/>

			{!hasGroupBy && <GroupByEmptyState onAddGroupBy={addGroupBy} />}

			{kind === 'state' && (
				<StatesOfField
					value={viewCountry}
					onChange={(next): void => setMap({ viewCountry: next })}
				/>
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

			{hasGroupBy && kind === 'point' && missingCoordinates.length > 0 && (
				<PointsRequirement
					missing={missingCoordinates.map((field) => `geo.location.${field}`)}
					areaColumn={areaColumn}
					onAddGroupBy={addGroupBy}
					onUseAreas={restoreAreas}
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
				<MapAreaField kind={kind} value={value} onChange={setMap} />
			)}

			<ProjectionField
				value={value?.map?.projection ?? DashboardtypesGeoMapProjectionDTO.mercator}
				onChange={(projection): void => setMap({ projection })}
			/>

			{kind !== 'point' && (
				<DrawAsField
					kind={kind}
					value={layer}
					onChange={(next): void => setMap({ layer: next })}
				/>
			)}

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
