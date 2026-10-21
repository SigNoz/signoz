import { normalizeCountry } from './normalizeCountry';
import type { SubdivisionSet } from './subdivisions';

/**
 * ISO 3166-2 code of a state/province within `set.country`. GeoIP emits the bare
 * subdivision code (`CA`) next to a separate country column, so both are taken;
 * a full code (`US-CA`), an alias (`IN-TS` → `IN-TG`) or an English name also
 * resolve. `null` when it can't be placed in this country.
 */
export function normalizeSubdivision(
	set: SubdivisionSet,
	country: string | null | undefined,
	region: string | number | null | undefined,
): string | null {
	if (region === null || region === undefined) {
		return null;
	}
	const value = String(region).trim();
	if (!value) {
		return null;
	}
	const upper = value.toUpperCase();
	const known = (code: string): string | null => {
		const resolved = set.aliases[code] ?? code;
		return set.codes.has(resolved) ? resolved : null;
	};
	if (/^[A-Z]{2}-[A-Z0-9]{1,3}$/.test(upper)) {
		return known(upper);
	}
	if (/^[A-Z0-9]{1,3}$/.test(upper)) {
		const iso2 = country ? normalizeCountry(country) : set.country;
		if (iso2 !== set.country) {
			return null;
		}
		const code = known(`${iso2}-${upper}`);
		if (code) {
			return code;
		}
	}
	return set.names[value.toLowerCase()] ?? null;
}
