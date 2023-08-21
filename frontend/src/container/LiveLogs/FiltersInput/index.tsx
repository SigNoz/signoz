import { Col } from 'antd';
import { initialQueriesMap } from 'constants/queryBuilder';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useEventSource } from 'providers/EventSource';
import { useCallback, useMemo } from 'react';
import {
	IBuilderQuery,
	Query,
	TagFilter,
} from 'types/api/queryBuilder/queryBuilderData';

import { getQueryWithoutFilterId } from '../utils';
import {
	ContainerStyled,
	FilterSearchInputStyled,
	SearchButtonStyled,
} from './styles';

function FiltersInput(): JSX.Element {
	const {
		stagedQuery,
		handleSetQueryData,
		redirectWithQueryBuilderData,
		currentQuery,
	} = useQueryBuilder();

	const { initialLoading, handleSetInitialLoading } = useEventSource();

	const handleChange = useCallback(
		(filters: TagFilter) => {
			const listQueryData = stagedQuery?.builder.queryData[0];

			if (!listQueryData) return;

			const queryData: IBuilderQuery = {
				...listQueryData,
				filters,
			};

			handleSetQueryData(0, queryData);
		},
		[stagedQuery, handleSetQueryData],
	);

	const query = useMemo(() => {
		if (stagedQuery && stagedQuery.builder.queryData.length > 0) {
			return stagedQuery?.builder.queryData[0];
		}

		return initialQueriesMap.logs.builder.queryData[0];
	}, [stagedQuery]);

	const handleSearch = useCallback(() => {
		if (initialLoading) {
			handleSetInitialLoading(false);
		}

		const preparedQuery: Query = getQueryWithoutFilterId(currentQuery);

		redirectWithQueryBuilderData(preparedQuery);
	}, [
		initialLoading,
		currentQuery,
		redirectWithQueryBuilderData,
		handleSetInitialLoading,
	]);

	return (
		<ContainerStyled>
			<Col flex={1}>
				<FilterSearchInputStyled query={query} onChange={handleChange} />
			</Col>
			<SearchButtonStyled onSearch={handleSearch} />
		</ContainerStyled>
	);
}

export default FiltersInput;
