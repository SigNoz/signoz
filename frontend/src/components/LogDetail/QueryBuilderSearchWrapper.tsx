import './QueryBuilderSearchWrapper.styles.scss';

import useInitialQuery from 'container/LogsExplorerContext/useInitialQuery';
import QueryBuilderSearch from 'container/QueryBuilder/filters/QueryBuilderSearch';
import { Dispatch, SetStateAction, useEffect } from 'react';
import { ILog } from 'types/api/logs/log';
import { Query, TagFilter } from 'types/api/queryBuilder/queryBuilderData';

function QueryBuilderSearchWrapper({
	log,
	filters,
	contextQuery,
	isEdit,
	suffixIcon,
	setFilters,
	setContextQuery,
}: QueryBuilderSearchWraperProps): JSX.Element {
	const initialContextQuery = useInitialQuery(log);

	useEffect(() => {
		setContextQuery(initialContextQuery);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleSearch = (tagFilters: TagFilter): void => {
		const tagFiltersLength = tagFilters.items.length;

		if (
			(!tagFiltersLength && (!filters || !filters.items.length)) ||
			tagFiltersLength === filters?.items.length ||
			!contextQuery
		)
			return;

		const nextQuery: Query = {
			...contextQuery,
			builder: {
				...contextQuery.builder,
				queryData: contextQuery.builder.queryData.map((item) => ({
					...item,
					filters: tagFilters,
				})),
			},
		};

		setFilters({ ...tagFilters });
		setContextQuery({ ...nextQuery });
	};

	// eslint-disable-next-line react/jsx-no-useless-fragment
	if (!contextQuery || !isEdit) return <></>;

	return (
		<QueryBuilderSearch
			query={contextQuery?.builder.queryData[0]}
			onChange={handleSearch}
			className="query-builder-search-wrapper"
			suffixIcon={suffixIcon}
		/>
	);
}

interface QueryBuilderSearchWraperProps {
	log: ILog;
	isEdit: boolean;
	contextQuery: Query | undefined;
	setContextQuery: Dispatch<SetStateAction<Query | undefined>>;
	filters: TagFilter | null;
	setFilters: Dispatch<SetStateAction<TagFilter | null>>;
	suffixIcon?: React.ReactNode;
}

QueryBuilderSearchWrapper.defaultProps = {
	suffixIcon: undefined,
};

export default QueryBuilderSearchWrapper;
