import { logqlQueries } from 'lib/__fixtures__/logql';
import parser from 'lib/logql/parser';

describe('lib/logql/parser', () => {
	it('parse valid queries', () => {
		logqlQueries.forEach((queryObject) => {
			expect(parser(queryObject.query)).toStrictEqual(queryObject.parsedQuery);
		});
	});
});
