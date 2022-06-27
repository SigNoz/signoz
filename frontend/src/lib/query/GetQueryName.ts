import { sortBy } from 'lodash-es';

const MAX_QUERIES = 26;
function GetQueryName(queries = []): string | null {
	if (!queries.length) return 'A';
	if (queries.length === MAX_QUERIES) {
		return null;
	}
	const sortedQueries = sortBy(queries, function (q) {
		return q.name;
	});

	let query_iterator_idx = 0;

	for (
		let charItr = 'A'.charCodeAt(0);
		charItr <= 'A'.charCodeAt(0) + MAX_QUERIES;
		charItr += 1
	) {
		if (charItr !== sortedQueries[query_iterator_idx]?.name.charCodeAt(0)) {
			return String.fromCharCode(charItr);
		}
		query_iterator_idx += 1;
	}

	return null;
}

export default GetQueryName;
