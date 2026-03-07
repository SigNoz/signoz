import { SeriesItem } from 'types/api/widgets/getQuery';

// eslint-disable-next-line sonarjs/cognitive-complexity
function getLabelNameFromMetric(
	metric: SeriesItem['labels'],
	query: string,
): string {
	let metricName = '';
	let pre = '';
	let post = '';
	let foundName = false;
	let hasPreLabels = false;
	let hasPostLabels = false;

	// eslint-disable-next-line no-restricted-syntax
	for (const [key, value] of Object.entries(metric)) {
		if (key === '__name__') {
			metricName = value || '';
			foundName = true;
		} else if (foundName) {
			if (hasPostLabels) {
				post += ',';
			}
			post += `${key}="${value}"`;
			hasPostLabels = true;
		} else {
			if (hasPreLabels) {
				pre += ',';
			}
			pre += `${key}="${value}"`;
			hasPreLabels = true;
		}
	}

	const result = metricName;

	if (!foundName && !hasPreLabels && hasPostLabels) {
		return query;
	}

	if (post.length === 0 && pre.length === 0) {
		if (result) {
			return result;
		}
		if (query) {
			return query;
		}
		return result;
	}
	return `${result}{${pre}${post}}`;
}

const getLabelName = (
	metric: SeriesItem['labels'],
	query: string,
	legends: string,
): string => {
	if (metric === undefined) {
		return '';
	}

	if (legends.length !== 0) {
		let endResult = legends;

		const startingVariables = legends.split('{{');

		// eslint-disable-next-line no-restricted-syntax
		for (const variable of startingVariables) {
			if (variable) {
				const variableName = variable.split('}}')[0];
				const variableValue = metric[variableName] || '';

				if (variableValue) {
					endResult = endResult.replace(`{{${variableName}}}`, variableValue);
				}
			}
		}

		return endResult;
	}

	return getLabelNameFromMetric(metric, query);
};

export default getLabelName;
