import { logqlQueries } from 'lib/__fixtures__/logql';
import { splitter } from 'lib/logql/splitter';

describe('lib/logql/splitter', () => {
	it('splitter valid quereies', () => {
		logqlQueries.forEach((queryObject) => {
			expect(splitter(queryObject.query)).toStrictEqual(queryObject.splitterQuery);
		});
	});
});
