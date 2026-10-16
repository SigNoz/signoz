import { FocusEvent, useCallback, useEffect, useMemo, useRef } from 'react';
import {
	convertExpressionToFilters,
	convertFiltersToExpression,
} from 'components/QueryBuilderV2/utils';
import { initialQueriesMap } from 'constants/queryBuilder';
import {
	IBuilderQuery,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { validateQuery } from 'utils/queryValidationUtils';

const EMPTY_FILTERS: TagFilter = { items: [], op: 'AND' };

interface UseFilterExpressionParams {
	filters: IBuilderQuery['filters'];
	groupBy?: IBuilderQuery['groupBy'];
	onFiltersChange: (filters: IBuilderQuery['filters']) => void;
}

interface UseFilterExpressionReturn {
	queryData: IBuilderQuery;
	onExpressionChange: (value: string) => void;
	onRun: (value: string) => void;
	onBlur: (event: FocusEvent<HTMLDivElement>) => void;
}

export function useFilterExpression({
	filters,
	groupBy,
	onFiltersChange,
}: UseFilterExpressionParams): UseFilterExpressionReturn {
	const expression = useMemo(
		() => convertFiltersToExpression(filters ?? EMPTY_FILTERS).expression,
		[filters],
	);

	const queryData = useMemo(
		(): IBuilderQuery => ({
			...initialQueriesMap[DataSource.TRACES].builder.queryData[0],
			dataSource: DataSource.TRACES,
			filters,
			filter: { expression },
			...(groupBy ? { groupBy } : {}),
		}),
		[filters, expression, groupBy],
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
			onFiltersChange({ items: convertExpressionToFilters(value), op: 'AND' });
		},
		[expression, onFiltersChange],
	);

	const onExpressionChange = useCallback((value: string): void => {
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

	return { queryData, onExpressionChange, onRun, onBlur };
}
