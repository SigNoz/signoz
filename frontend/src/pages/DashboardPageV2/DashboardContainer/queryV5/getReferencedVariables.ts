import type { DashboardtypesQueryDTO } from 'api/generated/services/sigNoz.schemas';
import { textContainsVariableReference } from 'lib/dashboardVariables/variableReference';

import { toQueryEnvelopes } from './buildQueryRangeRequest';

// Envelope spec fields that can carry a variable reference: a builder query's
// filter expression, or a PromQL/ClickHouse query string.
interface ReferenceableSpec {
	query?: string;
	filter?: { expression?: string };
}

/** Every text string in a panel's queries that could reference a variable. */
function extractQueryTexts(queries: DashboardtypesQueryDTO[]): string[] {
	const texts: string[] = [];
	toQueryEnvelopes(queries).forEach((envelope) => {
		const spec = envelope.spec as ReferenceableSpec | undefined;
		if (typeof spec?.query === 'string') {
			texts.push(spec.query);
		}
		if (typeof spec?.filter?.expression === 'string') {
			texts.push(spec.filter.expression);
		}
	});
	return texts;
}

/**
 * The subset of `variableNames` a panel's queries reference (`$name`, `{{.name}}`,
 * `[[name]]`), so a variable change only refetches the panels that actually use it.
 * Reuses the shared text-based reference detector over the panel's filter/query text.
 */
export function getReferencedVariables(
	queries: DashboardtypesQueryDTO[],
	variableNames: string[],
): string[] {
	if (queries.length === 0 || variableNames.length === 0) {
		return [];
	}
	const texts = extractQueryTexts(queries);
	if (texts.length === 0) {
		return [];
	}
	return variableNames.filter((name) =>
		texts.some((text) => textContainsVariableReference(text, name)),
	);
}
