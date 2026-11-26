import { escapeRegExp } from 'lodash-es';

// ponytail: a text match, not a JSON path, so an identical `"key": value` earlier
// in the document wins. Switch to a JSON tree parser (jsonc-parser) if that bites.
export function lineOfJsonEntry(
	source: string,
	key: string,
	value: unknown,
): number | undefined {
	const entry = new RegExp(
		`"${escapeRegExp(key)}"\\s*:\\s*${escapeRegExp(JSON.stringify(value))}`,
	);
	const index = source.search(entry);
	return index < 0 ? undefined : source.slice(0, index).split('\n').length;
}
