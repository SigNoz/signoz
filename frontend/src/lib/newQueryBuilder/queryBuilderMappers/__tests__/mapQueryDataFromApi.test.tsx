import { mapQueryDataFromApi } from '../mapQueryDataFromApi';
import {
	compositeQueriesWithFunctions,
	compositeQueryWithoutVariables,
	compositeQueryWithVariables,
	defaultOutput,
	outputWithFunctions,
	replaceVariables,
	stepIntervalUnchanged,
	widgetQueriesWithFunctions,
	widgetQueryWithoutVariables,
	widgetQueryWithVariables,
} from './mapQueryDataFromApiInputs';

jest.mock('uuid', () => ({
	v4: (): string => 'test-id',
}));

describe('mapQueryDataFromApi function tests', () => {
	it('should not update the step interval when query is passed', () => {
		const output = mapQueryDataFromApi(
			compositeQueryWithoutVariables,
			widgetQueryWithoutVariables,
		);

		// composite query is the response from the `v3/query_range/format` API call.
		// even if the composite query returns stepInterval updated do not modify it
		expect(output).toStrictEqual(stepIntervalUnchanged);
	});

	it('should update filter from the composite query', () => {
		const output = mapQueryDataFromApi(
			compositeQueryWithVariables,
			widgetQueryWithVariables,
		);

		// replace the variables in the widget query and leave the rest items untouched
		expect(output).toStrictEqual(replaceVariables);
	});

	it('should not update the step intervals with multiple queries and functions', () => {
		const output = mapQueryDataFromApi(
			compositeQueriesWithFunctions,
			widgetQueriesWithFunctions,
		);

		expect(output).toStrictEqual(outputWithFunctions);
	});

	it('should use the default query values and the compositeQuery object when query is not passed', () => {
		const output = mapQueryDataFromApi(compositeQueryWithoutVariables);

		// when the query object is not passed take the initial values and merge the composite query on top of it
		expect(output).toStrictEqual(defaultOutput);
	});
});
