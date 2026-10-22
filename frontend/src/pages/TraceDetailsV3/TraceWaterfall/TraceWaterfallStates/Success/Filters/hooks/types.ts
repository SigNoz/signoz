import { MutableRefObject } from 'react';
import { IQueryPair } from 'types/antlrQueryTypes';

/**
 * Shared props for expression-based filter hooks.
 * Each hook reads the current expression + the pairs parsed from the last
 * committed expression, and manipulates the expression via remove/add pattern.
 */
export interface ExpressionFilterProps {
	expression: string;
	committedPairs: IQueryPair[];
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
