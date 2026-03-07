import { logqlQueries } from 'lib/__fixtures__/logql';
import parser from 'lib/logql/parser';

describe('lib/logql/parser', () => {
	test('parse valid queries', () => {
		logqlQueries.forEach((queryObject) => {
			expect(parser(queryObject.query)).toEqual(queryObject.parsedQuery);
		});
	});
});
