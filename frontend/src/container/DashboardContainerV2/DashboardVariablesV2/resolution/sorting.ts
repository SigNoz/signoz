/**
 * Apply V2 sort modes to a resolved value list.
 *
 * Sort values come from the perses spec — `none`, `alphabetical-asc`,
 * `alphabetical-desc`, `numerical-asc`, `numerical-desc`. Numerical sort
 * falls back to string compare for values that aren't numbers so we never
 * throw away non-numeric entries.
 */
export function applySort(
	values: string[],
	sort: string | null | undefined,
): string[] {
	if (!sort || sort === 'none' || values.length <= 1) {return values;}
	const copy = values.slice();
	if (sort === 'alphabetical-asc') {
		copy.sort((a, b) => a.localeCompare(b));
	} else if (sort === 'alphabetical-desc') {
		copy.sort((a, b) => b.localeCompare(a));
	} else if (sort === 'numerical-asc' || sort === 'numerical-desc') {
		copy.sort((a, b) => {
			const na = Number(a);
			const nb = Number(b);
			const aFinite = Number.isFinite(na);
			const bFinite = Number.isFinite(nb);
			if (aFinite && bFinite) {
				return sort === 'numerical-asc' ? na - nb : nb - na;
			}
			// Mixed numeric/non-numeric: keep non-numerics at the end, sorted alpha.
			if (aFinite) {return -1;}
			if (bFinite) {return 1;}
			return sort === 'numerical-asc'
				? a.localeCompare(b)
				: b.localeCompare(a);
		});
	}
	return copy;
}
