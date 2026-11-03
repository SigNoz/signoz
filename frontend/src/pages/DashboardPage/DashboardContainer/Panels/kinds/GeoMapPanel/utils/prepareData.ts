import {
	DashboardtypesGeoMapLayerDTO,
	DashboardtypesGeoMapViewDTO,
} from 'api/generated/services/sigNoz.schemas';
import { SUBDIVISION_COUNTRY_CODES } from 'lib/visualization/charts/GeoMap/geo/subdivisionCountries';
import { ColorRampScale } from 'lib/visualization/colorRamp/types';
import type { PanelTableColumn } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import { getColumnUnit } from '../../../utils/getColumnUnit';
import { resolveActiveThreshold } from '../../../utils/evaluateThresholds';
import { toFiniteNumber } from './cellValues';
import { MAX_ROWS } from '../constants';
import {
	findById,
	findStaleBindings,
	isCoordinateColumn,
	resolveLocation,
} from './locationColumns';
import { placeRow } from './placeRow';
import {
	type GeoMapPanelData,
	LocationKind,
	type PrepareGeoMapDataArgs,
} from '../types';

const STATE_COUNTRIES = new Set<string>(SUBDIVISION_COUNTRY_CODES);

/**
 * One location per row of the joined scalar table. A location seen twice keeps
 * its first row: averages and rates can't be summed.
 */
export function prepareGeoMapData({
	table,
	location,
	map,
	scale,
	subdivisions,
	thresholds = [],
	columnUnits = {},
}: PrepareGeoMapDataArgs): GeoMapPanelData {
	const columns = table?.columns ?? [];
	const allRows = table?.rows ?? [];
	// Joined queries skip the request's row limit, so the cap holds here too.
	const rows = allRows.slice(0, MAX_ROWS);
	const isLocation = (column: PanelTableColumn): boolean =>
		!column.isValueColumn || isCoordinateColumn(column.id, location);
	const valueColumns = columns.filter((column) => !isLocation(column));
	const groupColumns = columns.filter(isLocation);

	const resolved = resolveLocation(groupColumns, location, map);
	const colorColumn = findById(valueColumns, map?.colorBy) ?? valueColumns[0];
	const sizeColumn = findById(valueColumns, map?.sizeBy);
	const isCoordinates = resolved?.kind === LocationKind.Coordinates;
	const wantsPoints = map?.layer === DashboardtypesGeoMapLayerDTO.points;
	const needsCountryView =
		resolved?.kind === LocationKind.Subdivision && !subdivisions;
	// A country view whose states are loading, as opposed to one they can't load for.
	const hasStatesView =
		map?.view === DashboardtypesGeoMapViewDTO.country &&
		STATE_COUNTRIES.has(map.viewCountry ?? '');

	const result: GeoMapPanelData = {
		location: resolved,
		layer: isCoordinates
			? 'points'
			: wantsPoints
				? 'bubbles'
				: (map?.layer ?? 'regions'),
		colorColumn,
		sizeColumn,
		regions: [],
		points: [],
		rowIndexById: new Map(),
		totalRows: rows.length,
		unmapped: [],
		unmappedRows: 0,
		otherCountryRows: 0,
		duplicateRows: 0,
		missingValueRows: 0,
		missingSizeRows: 0,
		thresholdConflictRows: 0,
		nonPositiveOnLogRows: 0,
		atRowLimit: allRows.length >= MAX_ROWS,
		staleBindings: findStaleBindings(columns, location, map),
		needsCountryView: needsCountryView && !hasStatesView,
		pointsWithoutCoordinates: wantsPoints && !!resolved && !isCoordinates,
	};
	if (!resolved || !colorColumn || needsCountryView) {
		return result;
	}

	const unmapped = new Map<string, number>();
	const seenCodes = new Set<string>();
	const colorUnit = getColumnUnit(colorColumn.id, columnUnits);
	const paint = (value: number): { color?: string } => {
		if (thresholds.length === 0) {
			return {};
		}
		const { threshold, isConflicting } = resolveActiveThreshold(
			thresholds,
			value,
			colorUnit,
		);
		if (isConflicting) {
			result.thresholdConflictRows += 1;
		}
		return threshold ? { color: threshold.color } : {};
	};
	const labelColumns = isCoordinates
		? groupColumns.filter(
				(column) => column !== resolved.lat && column !== resolved.lon,
			)
		: [];
	// Bubbles and points are drawn at their size; shaded shapes draw without one.
	const needsSize = Boolean(sizeColumn) && result.layer !== 'regions';

	rows.forEach((row, index) => {
		const value = toFiniteNumber(row.data[colorColumn.id]);
		if (value === null) {
			result.missingValueRows += 1;
			return;
		}
		const placement = placeRow(row, resolved, {
			countryFormat: location?.countryFormat,
			subdivisions,
			labelColumns,
		});
		const size = sizeColumn ? toFiniteNumber(row.data[sizeColumn.id]) : undefined;
		const sized = sizeColumn ? { size } : {};

		if (placement.kind === 'unmapped') {
			result.unmappedRows += 1;
			unmapped.set(placement.raw, (unmapped.get(placement.raw) ?? 0) + 1);
			return;
		}
		if (placement.kind === 'otherCountry') {
			result.otherCountryRows += 1;
			return;
		}
		if (placement.kind === 'region') {
			if (seenCodes.has(placement.code)) {
				result.duplicateRows += 1;
				return;
			}
			seenCodes.add(placement.code);
		}
		if (needsSize && !(size != null && size > 0)) {
			result.missingSizeRows += 1;
			return;
		}
		if (placement.kind === 'point') {
			const id = String(index);
			result.points.push({
				id,
				value,
				...placement.point,
				...sized,
				...paint(value),
			});
			result.rowIndexById.set(id, index);
		} else {
			result.regions.push({
				code: placement.code,
				value,
				raw: placement.raw,
				...sized,
				...paint(value),
			});
			result.rowIndexById.set(placement.code, index);
		}
		if (scale === ColorRampScale.Log && value <= 0) {
			result.nonPositiveOnLogRows += 1;
		}
	});

	result.unmapped = [...unmapped].map(([raw, rows]) => ({ raw, rows }));
	return result;
}
