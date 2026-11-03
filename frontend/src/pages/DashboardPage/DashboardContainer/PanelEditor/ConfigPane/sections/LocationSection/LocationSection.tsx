import { useCallback, useMemo } from 'react';
import {
	DashboardtypesGeoMapProjectionDTO,
	type DashboardtypesGeoMapLocationDTO,
	type DashboardtypesGeoMapSettingsDTO,
} from 'api/generated/services/sigNoz.schemas';
import {
	detectLocationColumns,
	findCoordinateColumns,
} from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/utils/locationColumns';
import type {
	SectionEditorProps,
	SectionKind,
} from 'pages/DashboardPage/DashboardContainer/Panels/types/sections';

import type { TableColumnOption } from '../../../hooks/useTableColumns';
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
import { LocationField, RowKind } from './types';
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

const NO_GROUP_COLUMNS: string[] = [];
const NO_TABLE_COLUMNS: TableColumnOption[] = [];

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
	groupColumns: groupByColumns = NO_GROUP_COLUMNS,
	tableColumns = NO_TABLE_COLUMNS,
	geoMapPlacement,
}: LocationSectionProps): JSX.Element {
	const addGroupBy = useAddGroupBy();
	const data = geoMapPlacement?.data;
	const kind = resolveRowKind(value, data);
	const isAuto = isAutoMode(value);
	const layer = resolveLayer(value, kind);
	const coordinateColumns = useMemo(() => {
		const keys = tableColumns.map((column) => column.key);
		const coordinates = findCoordinateColumns(
			[...groupByColumns, ...keys],
			value?.location,
		);
		return keys.filter((key) => coordinates.has(key));
	}, [groupByColumns, tableColumns, value?.location]);
	const groupColumns = useMemo(
		() => [...groupByColumns, ...coordinateColumns],
		[groupByColumns, coordinateColumns],
	);
	const valueItems = useMemo(
		() =>
			tableColumns
				.filter((column) => !coordinateColumns.includes(column.key))
				.map((column) => ({
					value: column.key,
					label: formatColumnOption(column),
				})),
		[tableColumns, coordinateColumns],
	);
	const hasGroupBy = groupColumns.length > 0;
	const viewCountry = value?.map?.viewCountry;
	const detected = useMemo(
		() => detectLocationColumns(groupColumns),
		[groupColumns],
	);
	const autoColumn = useCallback(
		(field: LocationField): string | undefined =>
			autoColumnFor(field, data?.location, detected),
		[data?.location, detected],
	);
	const { pickKind, areaColumn, restoreAreas } = useRowKindSwitch({
		value,
		onChange,
		kind,
		isAuto,
		layer,
		detected,
		suggestedCountry: geoMapPlacement?.suggestedCountry,
	});

	const setLocation = useCallback(
		(patch: Partial<DashboardtypesGeoMapLocationDTO>): void =>
			onChange({ ...value, location: patchLocation(value?.location, patch) }),
		[onChange, value],
	);
	const setMap = useCallback(
		(patch: Partial<DashboardtypesGeoMapSettingsDTO>): void =>
			onChange({ ...value, map: patchMap(value?.map, { layer, ...patch }) }),
		[onChange, value, layer],
	);
	const missingCoordinates = useMemo(
		() =>
			[LocationField.Lat, LocationField.Lon].filter(
				(field) => !(value?.location?.[field] || autoColumn(field)),
			),
		[value?.location, autoColumn],
	);
	const kindHelp = useMemo(
		() => describeKind({ hasGroupBy, kind, isAuto, autoColumn }),
		[hasGroupBy, kind, isAuto, autoColumn],
	);
	const status = useMemo(
		() => data && describePlacement(data, kind, viewCountry),
		[data, kind, viewCountry],
	);
	const unplaced = useMemo(
		() => (data ? describeUnplaced(data, kind, viewCountry) : []),
		[data, kind, viewCountry],
	);

	return (
		<div className={styles.section}>
			<RowKindField
				kind={kind}
				isAuto={isAuto}
				help={kindHelp}
				onPick={pickKind}
			/>

			{!hasGroupBy && <GroupByEmptyState onAddGroupBy={addGroupBy} />}

			{kind === RowKind.State && (
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

			{hasGroupBy && kind === RowKind.Point && missingCoordinates.length > 0 && (
				<PointsRequirement
					missing={missingCoordinates.map((field) => `geo.location.${field}`)}
					areaColumn={areaColumn}
					onAddGroupBy={addGroupBy}
					onUseAreas={restoreAreas}
				/>
			)}

			{status && data && <PlacementStatus status={status} unplaced={unplaced} />}

			{hasGroupBy && kind === RowKind.Country && (
				<CountryFormatField
					value={value?.location?.countryFormat}
					onChange={(countryFormat): void => setLocation({ countryFormat })}
				/>
			)}

			{kind !== RowKind.State && (
				<MapAreaField kind={kind} value={value} onChange={setMap} />
			)}

			<ProjectionField
				value={value?.map?.projection ?? DashboardtypesGeoMapProjectionDTO.mercator}
				onChange={(projection): void => setMap({ projection })}
			/>

			{kind !== RowKind.Point && (
				<DrawAsField
					kind={kind}
					value={layer}
					onChange={(next): void => setMap({ layer: next })}
				/>
			)}

			<ValueColumnsFields
				layer={layer}
				valueItems={valueItems}
				colorBy={value?.map?.colorBy}
				sizeBy={value?.map?.sizeBy}
				onChange={setMap}
			/>
		</div>
	);
}

export default LocationSection;
