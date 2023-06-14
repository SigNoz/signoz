import { Tabs } from 'antd';
import { COMPOSITE_QUERY } from 'constants/queryBuilderQueryNames';
import QuerySection from 'container/TracesExplorer/QuerySection';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useUrlQuery from 'hooks/useUrlQuery';
import useUrlQueryData from 'hooks/useUrlQueryData';
import { useCallback, useEffect, useMemo } from 'react';
import { Query } from 'types/api/queryBuilder/queryBuilderData';

import {
	CURRENT_TRACES_EXPLORER_TAB,
	initialTracesQuery,
	TracesExplorerTabs,
} from './constants';
import { Container } from './styles';
import { getTabsItems } from './utils';

function TracesExplorer(): JSX.Element {
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const {
		queryData: currentUrlTab,
		redirectWithQuery: redirectWithCurrentTab,
	} = useUrlQueryData<string>(CURRENT_TRACES_EXPLORER_TAB);
	const { query: currentUrlQuery } = useUrlQueryData<Query>(COMPOSITE_QUERY);

	const urlQuery = useUrlQuery();

	const currentTab = currentUrlTab || TracesExplorerTabs.TIME_SERIES;
	const tabsItems = useMemo(() => getTabsItems(currentQuery), [currentQuery]);

	const onRunQuery = useCallback((): void => {
		if (currentQuery.builder.queryData.length === 0) {
			redirectWithQueryBuilderData(initialTracesQuery);
		} else {
			redirectWithQueryBuilderData(currentQuery);
		}
	}, [currentQuery, redirectWithQueryBuilderData]);

	const onTabChange = useCallback(
		(tabKey: string): void => {
			redirectWithCurrentTab(tabKey);
		},
		[redirectWithCurrentTab],
	);

	useEffect(() => {
		if (currentUrlTab) return;

		redirectWithCurrentTab(TracesExplorerTabs.TIME_SERIES);
	}, [currentUrlTab, redirectWithCurrentTab]);

	useEffect(() => {
		if (currentUrlQuery) return;

		redirectWithQueryBuilderData(initialTracesQuery);
	}, [currentUrlQuery, urlQuery, redirectWithQueryBuilderData]);

	return (
		<>
			<QuerySection runQuery={onRunQuery} />

			<Container>
				<Tabs activeKey={currentTab} items={tabsItems} onChange={onTabChange} />
			</Container>
		</>
	);
}

export default TracesExplorer;
