import { IBuilderTraceOperator } from 'types/api/queryBuilder/queryBuilderData';

import { getInvolvedQueriesInTraceOperator } from '../utils/utils';

const makeTraceOperator = (expression: string): IBuilderTraceOperator =>
	(({ expression } as unknown) as IBuilderTraceOperator);

describe('getInvolvedQueriesInTraceOperator', () => {
	it('returns empty array for empty input', () => {
		const result = getInvolvedQueriesInTraceOperator([]);
		expect(result).toEqual([]);
	});

	it('extracts identifiers from expression', () => {
		const result = getInvolvedQueriesInTraceOperator([
			makeTraceOperator('A => B'),
		]);
		expect(result).toEqual(['A', 'B']);
	});

	it('extracts identifiers from complex expression', () => {
		const result = getInvolvedQueriesInTraceOperator([
			makeTraceOperator('A => (NOT B || C)'),
		]);
		expect(result).toEqual(['A', 'B', 'C']);
	});

	it('filters out querynames from complex expression', () => {
		const result = getInvolvedQueriesInTraceOperator([
			makeTraceOperator(
				'(A1 && (NOT B2 || (C3 -> (D4 && E5)))) => ((F6 || G7) && (NOT (H8 -> I9)))',
			),
		]);
		expect(result).toEqual([
			'A1',
			'B2',
			'C3',
			'D4',
			'E5',
			'F6',
			'G7',
			'H8',
			'I9',
		]);
	});
});
