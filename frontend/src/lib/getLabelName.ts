import { QueryData } from 'types/api/widgets/getQuery';

const getLabelName = (metric: QueryData['metric'], query: string): string => {
	if (metric === undefined) {
		return '';
	}

	const keysArray = Object.keys(metric);

	const index = keysArray.findIndex((e) => e === '__name__');

	const preArray = keysArray.slice(0, index);
	const postArray = keysArray.slice(index + 1, keysArray.length);

	if (index === undefined && preArray.length === 0 && postArray.length) {
		return query;
	}

	const post = postArray.map((e) => `${e}="${metric[e]}"`).join(',');
	const pre = preArray.map((e) => `${e}="${metric[e]}"`).join(',');

	return `${metric[keysArray[index]]}{${pre}${post}}`;
};

export default getLabelName;
