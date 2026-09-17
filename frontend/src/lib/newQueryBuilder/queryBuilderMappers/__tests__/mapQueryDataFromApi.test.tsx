import type { Query } from 'types/api/queryBuilder/queryBuilderData';

import { mapQueryDataFromApi } from '../mapQueryDataFromApi';
import {
	compositeQueriesWithFunctions,
	compositeQueryWithoutVariables,
	compositeQueryWithVariables,
	defaultOutput,
	outputWithFunctions,
	replaceVariables,
	stepIntervalUnchanged,
} from './mapQueryDataFromApiInputs';

vi.mock('uuid', () => ({
	v4: (): string => 'test-id',
}));

// NOTE: the `uuid` mock above only takes effect in jsdom. In browser mode
// `uuid` is served pre-bundled and `vi.mock` cannot intercept it, so the
// generated top-level `id` is random there. Pin it to the expected value and
// compare everything else strictly.
const withExpectedId = (output: Query, expected: { id: string }): Query => ({
	...output,
	id: expected.id,
});

describe('mapQueryDataFromApi function tests', () => {
	it('should not update the step interval when query is passed', () => {
		const output = mapQueryDataFromApi(compositeQueryWithoutVariables);

		// composite query is the response from the `v3/query_range/format` API call.
		// even if the composite query returns stepInterval updated do not modify it
		expect(output.id).toStrictEqual(expect.any(String));
		expect(withExpectedId(output, stepIntervalUnchanged)).toStrictEqual(
			stepIntervalUnchanged,
		);
	});

	it('should update filter from the composite query', () => {
		const output = mapQueryDataFromApi(compositeQueryWithVariables);

		// replace the variables in the widget query and leave the rest items untouched
		expect(output.id).toStrictEqual(expect.any(String));
		expect(withExpectedId(output, replaceVariables)).toStrictEqual(
			replaceVariables,
		);
	});

	it('should not update the step intervals with multiple queries and functions', () => {
		const output = mapQueryDataFromApi(compositeQueriesWithFunctions);

		expect(output.id).toStrictEqual(expect.any(String));
		expect(withExpectedId(output, outputWithFunctions)).toStrictEqual(
			outputWithFunctions,
		);
	});

	it('should use the default query values and the compositeQuery object when query is not passed', () => {
		const output = mapQueryDataFromApi(compositeQueryWithoutVariables);

		// when the query object is not passed take the initial values and merge the composite query on top of it
		expect(output.id).toStrictEqual(expect.any(String));
		expect(withExpectedId(output, defaultOutput)).toStrictEqual(defaultOutput);
	});
});
