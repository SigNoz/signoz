import { useCallback, useMemo } from 'react';
import { removeKeysFromExpression } from 'components/QueryBuilderV2/utils';

import { applyExpression, ExpressionFilterProps } from './types';

interface UseHighlightErrorsReturn {
	isHighlightErrors: boolean;
	handleToggle: (checked: boolean) => void;
}

const ERROR_KEY = 'has_error';

export function useHighlightErrors(
	props: ExpressionFilterProps,
): UseHighlightErrorsReturn {
	const { expression, filters, setExpression, expressionRef, runQuery } = props;

	// Derive from filters (only updates after runQuery, not on every keystroke)
	const isHighlightErrors = useMemo(
		() =>
			filters.items.some(
				(item) =>
					item.key?.key === ERROR_KEY &&
					(item.value === true || item.value === 'true'),
			),
		[filters],
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
