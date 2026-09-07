import type { Querybuildertypesv5QueryRangeRequestDTOVariables } from 'api/generated/services/sigNoz.schemas';

// The four syntaxes a dashboard body may carry. Group 1 covers `{{name}}` and
// `{{.name}}`, group 2 `[[name]]`, group 3 `$name`. The `$` form takes dotted
// names (`$service.name`) but not a trailing dot, so a sentence-ending period
// stays prose; `$__…` macros are excluded, as in the query reference engine.
const VARIABLE_PATTERN =
	/\{\{\s*\.?([\w.-]+)\s*\}\}|\[\[\s*([\w.-]+)\s*\]\]|\$(?!__)([A-Za-z_]\w*(?:\.\w+)*)/g;

// Variable values arrive as scalars or lists of them; anything else is not
// something a reader would want spliced into prose.
function formatValue(value: unknown): string | null {
	if (Array.isArray(value)) {
		return value.map((entry) => formatValue(entry) ?? '').join(', ');
	}
	if (typeof value === 'string') {
		return value;
	}
	if (typeof value === 'number' || typeof value === 'boolean') {
		return value.toString();
	}
	return null;
}

/**
 * Substitutes dashboard variables into a Markdown body before it is parsed, so an
 * injected value becomes Markdown *content* rather than markup — dynamic-variable
 * values come from telemetry and are attacker-influenceable.
 *
 * An undefined variable is left as literal text, matching how queries treat one.
 */
export function interpolateVariables(
	text: string,
	variables: Querybuildertypesv5QueryRangeRequestDTOVariables | undefined,
): string {
	if (!text || !variables) {
		return text;
	}

	return text.replace(
		VARIABLE_PATTERN,
		(match, braced?: string, bracketed?: string, dollar?: string): string => {
			const name = braced ?? bracketed ?? dollar;
			if (!name) {
				return match;
			}
			const formatted = formatValue(variables[name]?.value);
			return formatted ?? match;
		},
	);
}
