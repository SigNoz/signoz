import type { ParsedExpressionFilter } from './types';

export function parseFilterExpression(
	expression: string,
): ParsedExpressionFilter[] {
	if (!expression?.trim()) return [];

	const filters: ParsedExpressionFilter[] = [];

	const eqRegex = /([a-zA-Z_][a-zA-Z0-9_.]*)(\s*)(=)(\s*)(?:"((?:[^\\"]|\\.)*)"|'((?:[^\\']|\\.)*)')/gi;
	for (const match of expression.matchAll(eqRegex)) {
		if (match.index !== undefined) {
			filters.push({
				key: match[1],
				op: '=',
				values: [match[5] ?? match[6]],
				index: match.index,
			});
		}
	}

	const inRegex = /([a-zA-Z_][a-zA-Z0-9_.]*)(\s+)IN(\s*)\[([^\]]+)\]/gi;
	for (const match of expression.matchAll(inRegex)) {
		if (match.index !== undefined) {
			const values = Array.from(
				match[4].matchAll(/(?:"((?:[^\\"]|\\.)*)"|'((?:[^\\']|\\.)*)')/g),
				(m) => m[1] ?? m[2],
			);
			if (values.length > 0) {
				filters.push({
					key: match[1],
					op: 'IN',
					values,
					index: match.index,
				});
			}
		}
	}

	return filters.sort((a, b) => a.index - b.index);
}

export function escapeRegExp(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Escapes dollar signs in replacement strings to prevent $1, $2 from being
 * interpreted as backreferences in String.replace()
 */
export function escapeReplacement(str: string): string {
	return str.replace(/\$/g, '$$$$');
}

export function replaceValueInExpression(
	expression: string,
	key: string,
	originalValue: string,
	newValue: string,
): string {
	const escapedKey = escapeRegExp(key);
	const escapedValue = escapeRegExp(originalValue);

	const regex = new RegExp(
		`\\b(${escapedKey}\\s*=\\s*)(['"])(${escapedValue})\\2`,
		'g',
	);

	return expression.replace(
		regex,
		(_: string, prefix: string, quote: string) =>
			`${prefix}${quote}${escapeReplacement(newValue)}${quote}`,
	);
}

export function replaceValuesInExpression(
	expression: string,
	key: string,
	originalValues: string[],
	suggestedValues: string[],
): string {
	const escapedKey = escapeRegExp(key);
	const inRegex = new RegExp(
		`\\b(${escapedKey}\\s+IN\\s*\\[)([^\\]]+)(\\])`,
		'gi',
	);

	return expression.replace(
		inRegex,
		(_: string, prefix: string, valuesList: string, suffix: string) => {
			let modifiedValues = valuesList;

			originalValues.forEach((original, index) => {
				const suggested = suggestedValues[index];
				if (original && suggested) {
					const valueRegex = new RegExp(`(['"])(${escapeRegExp(original)})\\1`, 'g');
					modifiedValues = modifiedValues.replace(
						valueRegex,
						(__: string, quote: string) =>
							`${quote}${escapeReplacement(suggested)}${quote}`,
					);
				}
			});

			return prefix + modifiedValues + suffix;
		},
	);
}
