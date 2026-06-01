/**
 * Applies V2 `capturingRegexp` to each value: if the regex matches and has a
 * capture group, replace the value with the first capture; otherwise keep
 * the raw value. Invalid regex silently passes values through.
 *
 * Empty results (no match at all) are filtered out — they would be useless
 * as selectable options.
 */
export function applyCapturingRegexp(
	values: string[],
	pattern: string | undefined | null,
): string[] {
	if (!pattern) {return values;}

	let re: RegExp;
	try {
		re = new RegExp(pattern);
	} catch {
		return values;
	}

	const out: string[] = [];
	values.forEach((v) => {
		const m = re.exec(v);
		if (!m) {return;}
		out.push(m[1] !== undefined ? m[1] : m[0]);
	});
	return out;
}
