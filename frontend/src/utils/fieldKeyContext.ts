import { TelemetrytypesFieldContextDTO } from 'api/generated/services/sigNoz.schemas';

// The DTO carries an unspecified '' member; as a prefix it would match any leading dot.
export const FIELD_CONTEXTS: readonly string[] = Object.values(
	TelemetrytypesFieldContextDTO,
).filter(Boolean);

export interface FieldContextPrefixMatch {
	context: string;
	remainder: string;
}

// Strictly `<context>.` at the start; a key that merely contains a context name
// (status.code, attribute) does not match.
export function getFieldContextPrefix(
	text: string,
): FieldContextPrefixMatch | null {
	const lower = text.toLowerCase();
	const context = FIELD_CONTEXTS.find((ctx) => lower.startsWith(`${ctx}.`));
	return context ? { context, remainder: text.slice(context.length + 1) } : null;
}

// A typed prefix narrows the server result to one context. Applying the same
// rule here keeps a previous result, shown while the next loads, from being
// labelled with a context it does not have.
export function matchesFieldContextPrefix(
	fieldContext: string | undefined,
	searchText: string,
): boolean {
	const prefix = getFieldContextPrefix(searchText);
	return !prefix || fieldContext === prefix.context;
}

// The keys API returns bare names even when the search text carried a context
// prefix; the label keeps that prefix so the picked key still names its context.
export function getFieldKeyLabel(name: string, searchText: string): string {
	const prefix = getFieldContextPrefix(searchText);
	if (!prefix || name.toLowerCase().startsWith(`${prefix.context}.`)) {
		return name;
	}
	return `${prefix.context}.${name}`;
}
