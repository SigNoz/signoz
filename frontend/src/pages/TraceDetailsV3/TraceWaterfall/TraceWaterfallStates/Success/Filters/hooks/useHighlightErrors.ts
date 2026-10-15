import { useCallback, useMemo } from 'react';
import { removeKeysFromExpression } from 'components/QueryBuilderV2/utils';
import { unquote } from 'utils/stringUtils';

import { applyExpression, ExpressionFilterProps } from './types';

interface UseHighlightErrorsReturn {
	isHighlightErrors: boolean;
	handleToggle: (checked: boolean) => void;
}

const ERROR_KEY = 'has_error';

export function useHighlightErrors(
	props: ExpressionFilterProps,
): UseHighlightErrorsReturn {
	const { expression, committedPairs, setExpression, expressionRef, runQuery } =
		props;

	// Derive from the committed pairs (only updates after runQuery, not on every keystroke)
	const isHighlightErrors = useMemo(
		() =>
			committedPairs.some(
				(pair) =>
					pair.key === ERROR_KEY &&
					pair.operator === '=' &&
					unquote(pair.value ?? '').toLowerCase() === 'true',
			),
		[committedPairs],
	);

	const handleToggle = useCallback(
		(checked: boolean): void => {
			// Always remove existing has_error first (whatever its value)
			let newExpr = removeKeysFromExpression(expression, [ERROR_KEY]);
			// Add back if turning ON
			if (checked) {
				newExpr = newExpr.trim()
					? `${newExpr.trim()} AND has_error = true`
					: `has_error = true`;
			}
			applyExpression(newExpr, { setExpression, expressionRef, runQuery });
		},
		[expression, setExpression, expressionRef, runQuery],
	);

	return { isHighlightErrors, handleToggle };
}
