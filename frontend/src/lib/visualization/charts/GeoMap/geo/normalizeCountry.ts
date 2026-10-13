import lookups from '../assets/lookups.json';
import { COUNTRY_BY_ISO2 } from './countries';

const ALIASES = lookups.aliases as Record<string, string>;
const ALPHA3 = lookups.alpha3 as Record<string, string>;
const NAMES = lookups.names as Record<string, string>;

/**
 * ISO alpha-2 for a group-by value: alpha-2 (any case), retired/territory
 * aliases, alpha-3, or an English name. `null` when it can't be placed.
 */
export function normalizeCountry(
	raw: string | number | null | undefined,
): string | null {
	if (raw === null || raw === undefined) {
		return null;
	}
	const value = String(raw).trim();
	if (!value) {
		return null;
	}
	const upper = value.toUpperCase();
	if (/^[A-Z]{2}$/.test(upper)) {
		return COUNTRY_BY_ISO2.has(upper) ? upper : (ALIASES[upper] ?? null);
	}
	if (/^[A-Z]{3}$/.test(upper) && ALPHA3[upper]) {
		return ALPHA3[upper];
	}
	return NAMES[value.toLowerCase()] ?? null;
}
