import type { GeoMapPanelData } from 'pages/DashboardPage/DashboardContainer/Panels/kinds/GeoMapPanel/types';

import { countryName } from './options';
import type { PlacementStatus, RowKind, UnplacedRow } from '../types';

/** Most rows "Show which" lists before counting the rest. */
const LISTED_UNPLACED = 20;

function rowsLabel(count: number): string {
	return `${count.toLocaleString('en-US')} ${count === 1 ? 'row' : 'rows'}`;
}

/** Why each unplaced row was left off, most specific first. */
export function describeUnplaced(
	data: GeoMapPanelData,
	kind: RowKind | undefined,
	viewCountry: string | undefined,
): UnplacedRow[] {
	const why =
		kind === 'point'
			? 'Not a usable latitude and longitude'
			: kind === 'state'
				? `Not a state of ${viewCountry ? countryName(viewCountry) : 'the country'}`
				: 'Not a country code or name';
	const rows: UnplacedRow[] = data.unmapped.map(({ raw, rows: count }) => ({
		value: raw || '(empty)',
		why: raw
			? count > 1
				? `${why} · ${rowsLabel(count)}`
				: why
			: `No value · ${rowsLabel(count)}`,
	}));
	if (data.otherCountryRows > 0) {
		rows.push({
			value: 'Other countries',
			why: `${rowsLabel(data.otherCountryRows)} outside this country`,
		});
	}
	if (data.duplicateRows > 0) {
		rows.push({
			value: 'Repeats',
			why: `${rowsLabel(data.duplicateRows)} ${data.duplicateRows === 1 ? 'repeats' : 'repeat'} a location; the first is shown`,
		});
	}
	if (data.missingValueRows > 0) {
		rows.push({
			value: 'No value',
			why: `${rowsLabel(data.missingValueRows)} without a ${data.colorColumn?.name ?? 'color'} value`,
		});
	}
	if (data.missingSizeRows > 0) {
		rows.push({
			value: 'No size',
			why: `${rowsLabel(data.missingSizeRows)} without a positive ${data.sizeColumn?.name ?? 'size'} value`,
		});
	}
	if (rows.length > LISTED_UNPLACED) {
		const rest = rows.length - LISTED_UNPLACED;
		return [
			...rows.slice(0, LISTED_UNPLACED),
			{ value: `${rest} more`, why: '' },
		];
	}
	return rows;
}

export function describePlacement(
	data: GeoMapPanelData,
	kind: RowKind | undefined,
	viewCountry: string | undefined,
): PlacementStatus | undefined {
	const total = data.totalRows;
	if (total === 0 || !kind) {
		return undefined;
	}
	if (kind === 'state' && !viewCountry) {
		return {
			tone: 'error',
			text: `0 of ${rowsLabel(total)} placed · pick a country first`,
		};
	}
	const placed = data.regions.length + data.points.length;
	if (placed === total) {
		return { tone: 'ok', text: `All ${rowsLabel(total)} placed` };
	}
	return {
		tone: placed === 0 ? 'error' : 'warn',
		text: `${placed.toLocaleString('en-US')} of ${rowsLabel(total)} placed`,
	};
}
