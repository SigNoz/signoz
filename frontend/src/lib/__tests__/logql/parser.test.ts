import { logqlQueries } from 'lib/__fixtures__/logql';
import parser from 'lib/logql/parser';

describe('lib/logql/parser', () => {
	test('parse valid queries', () => {
		logqlQueries.forEach((queryObject) => {
			try {
				parser(queryObject.query);
			} catch (e) {
				console.log(e);
			}
			expect(parser(queryObject.query)).toEqual(queryObject.parsedQuery);
		});
	});
});
