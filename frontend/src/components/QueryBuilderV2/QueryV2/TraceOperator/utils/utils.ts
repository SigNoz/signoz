import { IBuilderTraceOperator } from 'types/api/queryBuilder/queryBuilderData';

export const getInvolvedQueriesInTraceOperator = (
	traceOperators: IBuilderTraceOperator[],
): string[] => {
	if (
		!traceOperators ||
		traceOperators.length === 0 ||
		traceOperators.length > 1
	)
		return [];

	const currentTraceOperator = traceOperators[0];

	// Match any word starting with letter or underscore
	const tokens =
		currentTraceOperator.expression.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) || [];

	// Filter out operator keywords
	const operators = new Set(['NOT']);
	return tokens.filter((t) => !operators.has(t));
};
