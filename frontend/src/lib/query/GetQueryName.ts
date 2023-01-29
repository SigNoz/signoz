import { sortBy } from 'lodash-es';

const MAX_QUERIES = 26;
function GetQueryName(queries: { name: string }[] = []): string | null {
	if (!queries.length) return 'A';
	if (queries.length === MAX_QUERIES) {
		return null;
	}
	const sortedQueries = sortBy(queries, (q) => q.name);

	let queryIteratorIdx = 0;

	for (
		let charItr = 'A'.charCodeAt(0);
		charItr <= 'A'.charCodeAt(0) + MAX_QUERIES;
		charItr += 1
	) {
		if (charItr !== sortedQueries[queryIteratorIdx]?.name.charCodeAt(0)) {
			return String.fromCharCode(charItr);
		}
		queryIteratorIdx += 1;
	}

	return null;
}

export default GetQueryName;
