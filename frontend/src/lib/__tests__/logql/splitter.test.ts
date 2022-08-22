import { logqlQueries } from 'lib/__fixtures__/logql';
import { splitter } from 'lib/logql/splitter';

describe('lib/logql/splitter', () => {
	test('splitter valid quereies', () => {
		logqlQueries.forEach((queryObject) => {
			expect(splitter(queryObject.query)).toEqual(queryObject.splitterQuery);
		});
	});
});
