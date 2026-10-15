import { getLoadedSubdivisions } from 'lib/visualization/charts/GeoMap/geo/subdivisionCache';
import type { PanelStatusDetail } from 'pages/DashboardPage/DashboardContainer/PanelsAndSectionsLayout/Panel/PanelStatus/types';
import type { PanelQueryData } from 'pages/DashboardPage/DashboardContainer/queryV5/types';

import type { PanelOfKind } from '../../types/rendererProps';
import { getJoinedScalarTable } from '../../utils/getJoinedScalarTable';
import { toPanelThreshold } from '../../utils/mapComparisonThreshold';
import { resolveColorScale } from './chartOptions';
import { MAX_ROWS } from './constants';
import { prepareGeoMapData } from './prepareData';
import type { GeoMapPanelData, StaleBinding } from './types';

export interface GeoMapMessage {
	title: string;
	description: string;
}

/** Unknown location values listed by name before the rest are counted. */
const LISTED_UNMAPPED = 5;

function formatCount(count: number): string {
	return count.toLocaleString('en-US');
}

function rows(count: number): string {
	return `${formatCount(count)} ${count === 1 ? 'row' : 'rows'}`;
}

const STALE_FIELD: Record<StaleBinding['field'], string> = {
	country: 'Country',
	region: 'Region',
	lat: 'Latitude',
	lon: 'Longitude',
	colorBy: 'Color by',
	sizeBy: 'Size by',
};

const STALE_FALLBACK: Record<StaleBinding['field'], string> = {
	country: 'the column is detected by name',
	region: 'the column is detected by name',
	lat: 'the column is detected by name',
	lon: 'the column is detected by name',
	colorBy: 'the first value column is used',
	sizeBy: 'sizes follow the color value',
};

function staleNote({ field, key }: StaleBinding): string {
	return `${STALE_FIELD[field]} uses ${key}, which isn't in the results, so ${STALE_FALLBACK[field]}.`;
}

function unmappedNote(data: GeoMapPanelData): string {
	const named = data.unmapped.map(({ raw }) => raw).filter(Boolean);
	const listed = named.slice(0, LISTED_UNMAPPED).join(', ');
	const rest = named.length - LISTED_UNMAPPED;
	const more = rest > 0 ? ` and ${formatCount(rest)} more` : '';
	const values = listed ? `: ${listed}${more}` : '';
	return `${rows(data.unmappedRows)} with a location the map doesn't know${values}.`;
}

function drawnCount(data: GeoMapPanelData): number {
	return data.regions.length + data.points.length;
}

/** Why the map shows nothing; undefined for plain no-data or when something draws. */
export function getGeoMapEmptyMessage(
	data: GeoMapPanelData,
): GeoMapMessage | undefined {
	if (data.totalRows === 0) {
		return undefined;
	}
	if (!data.location) {
		return {
			title: 'Group by a location',
			description:
				'Group the query by a country, region, or latitude and longitude attribute, such as geo.country.iso_code.',
		};
	}
	if (!data.colorColumn) {
		return {
			title: 'Add a value',
			description: 'The map colors each location by a value column.',
		};
	}
	if (data.needsCountryView) {
		return {
			title: 'Pick a country view',
			description: 'States and provinces show one country at a time.',
		};
	}
	if (drawnCount(data) > 0) {
		return undefined;
	}
	return {
		title: `0 of ${rows(data.totalRows)} placed`,
		description:
			data.unmappedRows > 0
				? unmappedNote(data)
				: 'No row has both a location and a value.',
	};
}

/** Rows left out and fallbacks; null when nothing to say or nothing draws. */
export function getGeoMapWarning(
	data: GeoMapPanelData,
): PanelStatusDetail | null {
	const drawn = drawnCount(data);
	if (drawn === 0) {
		return null;
	}
	const messages = [
		...data.staleBindings.map(staleNote),
		data.pointsWithoutCoordinates &&
			'Points need latitude and longitude columns, so locations are drawn as bubbles.',
		data.atRowLimit &&
			`The query stops at ${formatCount(MAX_ROWS)} rows. Add a filter to see the rest.`,
		data.unmappedRows > 0 && unmappedNote(data),
		data.otherCountryRows > 0 &&
			`${rows(data.otherCountryRows)} from other countries, outside this view.`,
		data.duplicateRows > 0 &&
			`${rows(data.duplicateRows)} repeat a location; the first row of each is shown.`,
		data.missingValueRows > 0 &&
			`${rows(data.missingValueRows)} without a ${data.colorColumn?.name ?? 'color'} value.`,
		data.thresholdConflictRows > 0 &&
			`${rows(data.thresholdConflictRows)} match more than one threshold; the first listed sets the color.`,
		data.nonPositiveOnLogRows > 0 &&
			`${rows(data.nonPositiveOnLogRows)} at or below 0 share the bottom color of the log scale. Switch the scale to linear to tell them apart.`,
	].filter((message): message is string => Boolean(message));
	if (messages.length === 0) {
		return null;
	}
	const fallsBack =
		data.staleBindings.length > 0 || data.pointsWithoutCoordinates;
	return {
		message:
			drawn < data.totalRows
				? `Showing ${formatCount(drawn)} of ${rows(data.totalRows)}.`
				: fallsBack
					? 'Some map settings fall back.'
					: 'Some values share a color.',
		messages,
	};
}

/**
 * The header's warning. States files load with the map, so on a country view
 * the states read here are those the map has loaded so far.
 */
export function getGeoMapDataWarning(
	panel: PanelOfKind<'signoz/GeoMapPanel'>,
	data: PanelQueryData,
): PanelStatusDetail | null {
	const { location, map, chartAppearance, thresholds, formatting } =
		panel.spec.plugin.spec;
	return getGeoMapWarning(
		prepareGeoMapData({
			table: getJoinedScalarTable(data),
			location,
			map,
			scale: resolveColorScale(chartAppearance?.colors),
			subdivisions:
				map?.view === 'country' ? getLoadedSubdivisions(map.viewCountry) : null,
			thresholds: (thresholds ?? []).map(toPanelThreshold),
			columnUnits: formatting?.columnUnits ?? undefined,
		}),
	);
}
