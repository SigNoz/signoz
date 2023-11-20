import { SeriesItem } from 'types/api/widgets/getQuery';

const getLabelName = (
	metric: SeriesItem['labels'],
	query: string,
	legends: string,
): string => {
	if (metric === undefined) {
		return '';
	}

	const keysArray = Object.keys(metric);
	if (legends.length !== 0) {
		const variables = legends
			.split('{{')
			.filter((e) => e)
			.map((e) => e.split('}}')[0]);

		const results = variables.map((variable) => metric[variable]);

		let endResult = legends;

		variables.forEach((e, index) => {
			endResult = endResult.replace(`{{${e}}}`, results[index]);
		});

		return endResult;
	}

	const index = keysArray.findIndex((e) => e === '__name__');

	const preArray = index !== -1 ? keysArray.slice(0, index) : [];
	const postArray = keysArray.slice(index + 1, keysArray.length);

	if (index === undefined && preArray.length === 0 && postArray.length) {
		return query;
	}

	const post = postArray.map((e) => `${e}="${metric[e]}"`).join(',');
	const pre = preArray.map((e) => `${e}="${metric[e]}"`).join(',');

	const value = metric[keysArray[index]];

	const result = `${value === undefined ? '' : value}`;

	if (post.length === 0 && pre.length === 0) {
		return result;
	}
	return `${result}{${pre}${post}}`;
};

export default getLabelName;
