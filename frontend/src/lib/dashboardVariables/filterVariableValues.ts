type VariableValue = string | number | boolean;

export interface FilterVariableValuesResult {
	values: VariableValue[];
	error?: string;
}

function buildRegex(pattern: string): RegExp {
	const slashDelimitedMatch = /^\/(.+)\/([gimsuy]*)$/.exec(pattern);

	if (slashDelimitedMatch) {
		const [, source, flags] = slashDelimitedMatch;
		return new RegExp(source, flags);
	}

	return new RegExp(pattern);
}

export function filterVariableValues(
	values: VariableValue[],
	pattern?: string,
): FilterVariableValuesResult {
	const trimmedPattern = pattern?.trim();

	if (!trimmedPattern) {
		return { values };
	}

	let regex: RegExp;
	try {
		regex = buildRegex(trimmedPattern);
	} catch (error) {
		return {
			values,
			error: error instanceof Error ? error.message : 'Invalid regex',
		};
	}

	const seen = new Set<string>();
	const filteredValues: VariableValue[] = [];

	values.forEach((value) => {
		regex.lastIndex = 0;
		const match = regex.exec(value.toString());

		if (!match) {
			return;
		}

		const capturedValue = match.slice(1).find((group) => group !== undefined);
		const nextValue = capturedValue ?? value;
		const nextValueKey = nextValue.toString();

		if (seen.has(nextValueKey)) {
			return;
		}

		seen.add(nextValueKey);
		filteredValues.push(nextValue);
	});

	return { values: filteredValues };
}
