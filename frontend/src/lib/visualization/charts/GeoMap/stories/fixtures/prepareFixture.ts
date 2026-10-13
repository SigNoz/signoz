import { normalizeCountry } from '../../geo/normalizeCountry';
import { normalizeSubdivision } from '../../geo/normalizeSubdivision';
import { SubdivisionSet } from '../../geo/subdivisions';
import { GeoMapDatum } from '../../types';
import { Fixture, FixtureRow } from './types';

export interface PreparedFixture {
	data: GeoMapDatum[];
	unmapped: FixtureRow[];
	duplicates: FixtureRow[];
}

/**
 * Stand-in for the panel's prepareGeoMapData: normalise, keep the first row per
 * shape. State datasets need their country's subdivisions loaded first.
 */
export function prepareFixture(
	fixture: Fixture,
	subdivisions: SubdivisionSet | null,
): PreparedFixture {
	const data: GeoMapDatum[] = [];
	const seen = new Set<string>();
	const unmapped: FixtureRow[] = [];
	const duplicates: FixtureRow[] = [];
	fixture.rows.forEach((row) => {
		const code =
			fixture.country && subdivisions
				? normalizeSubdivision(subdivisions, row.country, row.raw)
				: normalizeCountry(row.raw);
		if (!code) {
			unmapped.push(row);
			return;
		}
		if (seen.has(code)) {
			duplicates.push(row);
			return;
		}
		seen.add(code);
		data.push({ code, value: row.value, raw: String(row.raw) });
	});
	return { data, unmapped, duplicates };
}

const COMPACT = new Intl.NumberFormat('en', {
	notation: 'compact',
	maximumFractionDigits: 1,
});

export function formatterFor(unit: Fixture['unit']): (value: number) => string {
	if (unit === 'percent') {
		return (value): string => `${value.toFixed(2)}%`;
	}
	if (unit === 'ms') {
		return (value): string => `${Math.round(value)} ms`;
	}
	return (value): string => COMPACT.format(value);
}
