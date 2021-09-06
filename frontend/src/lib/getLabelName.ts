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

	return `${metric[keysArray[index]]}(${preArray
		.map((e) => `${e}=${metric[e]}`)
		.join(',')}${postArray.map((e) => `${e}=${metric[e]}`).join(',')})`;
};

export default getLabelName;
