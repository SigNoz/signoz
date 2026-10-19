import { useCallback, useEffect, useRef, useState } from 'react';
import { QueryParams } from 'constants/query';
import { getFilterQueryData } from 'container/LogDetailedView/logAttributeActions.utils';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useUrlQuery from 'hooks/useUrlQuery';
import { ILog } from 'types/api/logs/log';
import { DataTypes } from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import { UseActiveLog } from './types';

export const useActiveLog = (): UseActiveLog => {
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();

	const [activeLog, setActiveLog] = useState<ILog | null>(null);

	// Close drawer/clear active log when query in URL changes
	const urlQuery = useUrlQuery();
	const compositeQuery = urlQuery.get(QueryParams.compositeQuery) ?? '';
	const prevQueryRef = useRef<string | null>(null);
	useEffect(() => {
		if (
			prevQueryRef.current !== null &&
			prevQueryRef.current !== compositeQuery
		) {
			setActiveLog(null);
		}
		prevQueryRef.current = compositeQuery;
	}, [compositeQuery]);

	const onSetActiveLog = useCallback((nextActiveLog: ILog): void => {
		setActiveLog(nextActiveLog);
	}, []);

	const onClearActiveLog = useCallback((): void => setActiveLog(null), []);

	const onAddToQuery = useCallback(
		(
			fieldKey: string,
			fieldValue: string,
			operator: string,
			dataType?: DataTypes,
		): void => {
			const nextQuery: Query = {
				...currentQuery,
				builder: {
					...currentQuery.builder,
					queryData: currentQuery.builder.queryData.map((item) =>
						getFilterQueryData(item, { fieldKey, dataType }, fieldValue, operator),
					),
				},
			};

			redirectWithQueryBuilderData(nextQuery);
		},
		[currentQuery, redirectWithQueryBuilderData],
	);

	return {
		activeLog,
		onSetActiveLog,
		onClearActiveLog,
		onAddToQuery,
	};
};
