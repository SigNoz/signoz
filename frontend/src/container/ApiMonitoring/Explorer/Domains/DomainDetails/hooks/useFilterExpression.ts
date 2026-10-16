import { FocusEvent, useCallback, useEffect, useMemo, useRef } from 'react';
import { initialQueriesMap } from 'constants/queryBuilder';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { validateQuery } from 'utils/queryValidationUtils';

interface UseFilterExpressionParams {
	expression: string;
	groupBy?: IBuilderQuery['groupBy'];
	onExpressionChange: (expression: string) => void;
}

interface UseFilterExpressionReturn {
	queryData: IBuilderQuery;
	onDraftChange: (value: string) => void;
	onRun: (value: string) => void;
	onBlur: (event: FocusEvent<HTMLDivElement>) => void;
}

export function useFilterExpression({
	expression,
	groupBy,
	onExpressionChange,
}: UseFilterExpressionParams): UseFilterExpressionReturn {
	const queryData = useMemo(
		(): IBuilderQuery => ({
			...initialQueriesMap[DataSource.TRACES].builder.queryData[0],
			dataSource: DataSource.TRACES,
			filter: { expression },
			...(groupBy ? { groupBy } : {}),
		}),
		[expression, groupBy],
	);

	const draftRef = useRef(expression);
	useEffect(() => {
		draftRef.current = expression;
	}, [expression]);

	const onRun = useCallback(
		(value: string): void => {
			if (value === expression || !validateQuery(value).isValid) {
				return;
			}
			onExpressionChange(value);
		},
		[expression, onExpressionChange],
	);

	const onDraftChange = useCallback((value: string): void => {
		draftRef.current = value;
	}, []);

	const onBlur = useCallback(
		(event: FocusEvent<HTMLDivElement>): void => {
			if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
				return;
			}
			onRun(draftRef.current);
		},
		[onRun],
	);

	return { queryData, onDraftChange, onRun, onBlur };
}
