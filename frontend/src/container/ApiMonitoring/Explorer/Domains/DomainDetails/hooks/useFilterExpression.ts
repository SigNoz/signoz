import { FocusEvent, useCallback, useEffect, useMemo, useRef } from 'react';
import {
	useQuerySearchOnRun,
	useUserExpression,
} from 'components/QueryBuilderV2';
import { initialQueriesMap } from 'constants/queryBuilder';
import { IBuilderQuery } from 'types/api/queryBuilder/queryBuilderData';
import { DataSource } from 'types/common/queryBuilder';
import { validateQuery } from 'utils/queryValidationUtils';

interface UseFilterExpressionParams {
	groupBy?: IBuilderQuery['groupBy'];
}

interface UseFilterExpressionReturn {
	expression: string;
	queryData: IBuilderQuery;
	onDraftChange: (value: string) => void;
	onRun: (value: string) => void;
	onBlur: (event: FocusEvent<HTMLDivElement>) => void;
}

/** Must be used inside a `QuerySearchV2Provider`. */
export function useFilterExpression({
	groupBy,
}: UseFilterExpressionParams = {}): UseFilterExpressionReturn {
	const expression = useUserExpression();
	const querySearchOnRun = useQuerySearchOnRun();

	const queryData = useMemo(
		(): IBuilderQuery => ({
			...initialQueriesMap[DataSource.TRACES].builder.queryData[0],
			dataSource: DataSource.TRACES,
			filter: { expression },
			...(groupBy ? { groupBy } : {}),
		}),
		[expression, groupBy],
	);

	const onRun = useCallback(
		(value: string): void => {
			if (validateQuery(value).isValid) {
				querySearchOnRun(value);
			}
		},
		[querySearchOnRun],
	);

	// A ref, not the provider's draft, so typing does not re-render the page.
	const draftRef = useRef(expression);
	useEffect(() => {
		draftRef.current = expression;
	}, [expression]);

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

	return { expression, queryData, onDraftChange, onRun, onBlur };
}
