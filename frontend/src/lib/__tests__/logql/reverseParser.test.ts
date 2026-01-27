import { logqlQueries } from 'lib/__fixtures__/logql';
import { reverseParser } from 'lib/logql/reverseParser';

describe('lib/logql/reverseParser', () => {
	test('reverse parse valid queries', () => {
		logqlQueries.forEach((queryObject) => {
			expect(reverseParser(queryObject.parsedQuery)).toEqual(queryObject.query);
		});
	});
});
