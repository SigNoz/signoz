/**
 * Leaf value codec: lossless, readable scalar encoding for the qsAlias wire.
 *
 * The wire is untyped text, so a string `"123"` and a number `123` would
 * otherwise be indistinguishable after a round-trip. To disambiguate without
 * hurting readability:
 *
 *  - Strings are emitted verbatim (`traces`, `service.name`, …) — readable.
 *  - Every non-string scalar and empty container is type-tagged with a leading
 *    `_` followed by its JSON form (`_123`, `_true`, `_null`, `_[]`, `_{}`).
 *  - A string that itself begins with `_` is escaped by doubling the leading
 *    `_`, so it round-trips as a string instead of being read as a tag.
 *  - `undefined` has no URL representation and is normalized to `null`.
 *
 * `_` is used as the tag because it is left unescaped by both qs
 * (`encodeValuesOnly`) and `URLSearchParams`, keeping tagged values readable.
 * Wire-special characters (`&`, `=`, `%`, …) are NOT handled here — the caller
 * percent-encodes values via qs `encodeValuesOnly`.
 */
import { Json } from './diff/predicates';

const TYPE_TAG = '_';

/** Encode a single leaf value into its wire token. */
export function encodeLeaf(value: Json): string {
	if (value === undefined) {
		return `${TYPE_TAG}null`;
	}
	if (typeof value === 'string') {
		// Double the leading tag so a literal string survives as a string.
		return value.startsWith(TYPE_TAG) ? `${TYPE_TAG}${value}` : value;
	}
	return `${TYPE_TAG}${JSON.stringify(value)}`;
}

/** Decode a wire token back into its leaf value. */
export function decodeLeaf(token: string): Json {
	if (!token.startsWith(TYPE_TAG)) {
		return token;
	}
	// `__…` is an escaped string — strip exactly one tag.
	if (token[TYPE_TAG.length] === TYPE_TAG) {
		return token.slice(TYPE_TAG.length);
	}
	try {
		return JSON.parse(token.slice(TYPE_TAG.length));
	} catch {
		// Hand-crafted / corrupted token — fall back to raw text, never throw.
		return token;
	}
}
