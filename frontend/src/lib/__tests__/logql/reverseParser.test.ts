import { logqlQueries } from 'lib/__fixtures__/logql';
import { reverseParser } from 'lib/logql/reverseParser';

describe('lib/logql/reverseParser', () => {
	it('reverse parse valid queries', () => {
		logqlQueries.forEach((queryObject) => {
			expect(reverseParser(queryObject.parsedQuery)).toStrictEqual(
				queryObject.query,
			);
		});
	});
});
