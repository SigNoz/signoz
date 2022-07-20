import splitter from 'lib/logql/splitter';
import { logqlQueries } from 'lib/__fixtures__/logql';
describe('lib/logql/splitter', () => {
	test('splitter valid quereies', () => {
		logqlQueries.forEach((queryObject) => {
			expect(splitter(queryObject.query)).toEqual(queryObject.splitterQuery);
		});
	});
});
