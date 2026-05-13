import { MutableRefObject } from 'react';
import { TagFilter } from 'types/api/queryBuilder/queryBuilderData';

/**
 * Shared props for expression-based filter hooks.
 * Each hook reads the current expression + derived filters,
 * and manipulates the expression via remove/add pattern.
 */
export interface ExpressionFilterProps {
	expression: string;
	filters: TagFilter;
	setExpression: (expr: string) => void;
	expressionRef: MutableRefObject<string>;
	runQuery: (expr: string) => void;
}

/**
 * Helper: update expression state, ref, and trigger query.
 */
export function applyExpression(
	newExpression: string,
	props: Pick<
		ExpressionFilterProps,
		'setExpression' | 'expressionRef' | 'runQuery'
	>,
): void {
	props.setExpression(newExpression);
	props.expressionRef.current = newExpression;
	props.runQuery(newExpression);
}
