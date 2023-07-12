import LogDetail from 'components/LogDetail';
import { QueryBuilderKeys } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { chooseAutocompleteFromCustomValue } from 'lib/newQueryBuilder/chooseAutocompleteFromCustomValue';
import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { SuccessResponse } from 'types/api';
import {
	BaseAutocompleteData,
	IQueryAutocompleteResponse,
} from 'types/api/queryBuilder/queryAutocompleteResponse';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { v4 as uuid } from 'uuid';

import { LogExplorerDetailedViewProps } from './LogExplorerDetailedView.interfaces';

function LogExplorerDetailedView({
	log,
	onClose,
}: LogExplorerDetailedViewProps): JSX.Element {
	const queryClient = useQueryClient();
	const { redirectWithQueryBuilderData, currentQuery } = useQueryBuilder();

	const handleAddQuery = useCallback(
		(fieldKey: string, fieldValue: string): void => {
			const keysAutocomplete: BaseAutocompleteData[] =
				queryClient.getQueryData<SuccessResponse<IQueryAutocompleteResponse>>(
					[QueryBuilderKeys.GET_AGGREGATE_KEYS],
					{ exact: false },
				)?.payload.attributeKeys || [];

			const existAutocompleteKey = chooseAutocompleteFromCustomValue(
				keysAutocomplete,
				fieldKey,
			);

			const nextQuery: Query = {
				...currentQuery,
				builder: {
					...currentQuery.builder,
					queryData: currentQuery.builder.queryData.map((item) => ({
						...item,
						filters: {
							...item.filters,
							items: [
								...item.filters.items.filter(
									(item) => item.key?.id !== existAutocompleteKey.id,
								),
								{
									id: uuid(),
									key: existAutocompleteKey,
									op: '=',
									value: fieldValue,
								},
							],
						},
					})),
				},
			};

			redirectWithQueryBuilderData(nextQuery);
		},
		[currentQuery, queryClient, redirectWithQueryBuilderData],
	);

	return <LogDetail log={log} onClose={onClose} onAddToQuery={handleAddQuery} />;
}

export default LogExplorerDetailedView;
