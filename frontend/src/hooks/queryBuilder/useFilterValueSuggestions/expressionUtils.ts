import type { ParsedExpressionFilter } from './types';

function unescapeValue(value: string): string {
	return value.replace(/\\(.)/g, '$1');
}

function skipQuotedString(
	expression: string,
	startIndex: number,
	quote: string,
): number {
	let i = startIndex;
	while (i < expression.length) {
		if (expression[i] === '\\' && i + 1 < expression.length) {
			i += 2;
		} else if (expression[i] === quote) {
			return i + 1;
		} else {
			i++;
		}
	}
	return i;
}

function findInClauseEnd(expression: string, startIndex: number): number {
	let i = startIndex;
	while (i < expression.length) {
		const char = expression[i];
		if (char === ']') {
			return i;
		}
		if (char === '"' || char === "'") {
			i = skipQuotedString(expression, i + 1, char);
		} else {
			i++;
		}
	}
	return -1;
}

export function parseFilterExpression(
	expression: string,
): ParsedExpressionFilter[] {
	if (!expression?.trim()) return [];

	const filters: ParsedExpressionFilter[] = [];

	const eqRegex = /([a-zA-Z_][a-zA-Z0-9_.]*)(\s*)(=)(\s*)(?:"((?:[^\\"]|\\.)*)"|'((?:[^\\']|\\.)*)')/gi;
	for (const match of expression.matchAll(eqRegex)) {
		if (match.index !== undefined) {
			const rawValue = match[5] ?? match[6];
			filters.push({
				key: match[1],
				op: '=',
				values: [unescapeValue(rawValue)],
				index: match.index,
			});
		}
	}

	const inStartRegex = /([a-zA-Z_][a-zA-Z0-9_.]*)(\s+)IN(\s*)\[/gi;
	for (const match of expression.matchAll(inStartRegex)) {
		if (match.index !== undefined) {
			const bracketStart = match.index + match[0].length;
			const bracketEnd = findInClauseEnd(expression, bracketStart);
			if (bracketEnd === -1) continue;

			const valuesList = expression.slice(bracketStart, bracketEnd);
			const valueMatches = Array.from(
				valuesList.matchAll(/(?:"((?:[^\\"]|\\.)*)"|'((?:[^\\']|\\.)*)')/g),
			);
			const values = valueMatches.map((m) => unescapeValue(m[1] ?? m[2]));

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

function escapeValueForQuote(value: string, quote: string): string {
	if (quote === "'") {
		return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
	}
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function createValueMatchPattern(value: string): string {
	return value
		.split('')
		.map((char) => {
			if (char === "'") {
				return "(?:\\\\'|')";
			}
			if (char === '"') {
				return '(?:\\\\"|")';
			}
			if (char === '\\') {
				return '\\\\';
			}

			return char.replace(/[.*+?^${}()|[\]]/g, '\\$&');
		})
		.join('');
}

export function replaceValueInExpression(
	expression: string,
	key: string,
	originalValue: string,
	newValue: string,
): string {
	const escapedKey = escapeRegExp(key);
	const valuePattern = createValueMatchPattern(originalValue);

	const regex = new RegExp(
		`(?<![a-zA-Z0-9_.])(${escapedKey}\\s*=\\s*)(['"])(${valuePattern})\\2`,
		'g',
	);

	return expression.replace(
		regex,
		(_: string, prefix: string, quote: string) =>
			`${prefix}${quote}${escapeValueForQuote(newValue, quote)}${quote}`,
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
		`(?<![a-zA-Z0-9_.])(${escapedKey}\\s+IN\\s*\\[)([\\s\\S]*?)(\\])`,
		'gi',
	);

	return expression.replace(
		inRegex,
		(_: string, prefix: string, valuesList: string, suffix: string) => {
			let modifiedValues = valuesList;

			originalValues.forEach((original, index) => {
				const suggested = suggestedValues[index];
				if (original && suggested) {
					const valuePattern = createValueMatchPattern(original);
					const valueRegex = new RegExp(`(['"])(${valuePattern})\\1`, 'g');
					modifiedValues = modifiedValues.replace(
						valueRegex,
						(__: string, quote: string) =>
							`${quote}${escapeValueForQuote(suggested, quote)}${quote}`,
					);
				}
			});

			return prefix + modifiedValues + suffix;
		},
	);
}
