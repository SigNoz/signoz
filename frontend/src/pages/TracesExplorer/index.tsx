import { Tabs } from 'antd';
import { COMPOSITE_QUERY } from 'constants/queryBuilderQueryNames';
import QuerySection from 'container/TracesExplorer/QuerySection';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback, useEffect, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import {
	CURRENT_TRACES_EXPLORER_TAB,
	initialTracesQuery,
	TracesExplorerTabs,
} from './constants';
import { Container } from './styles';
import { getTabsItems } from './utils';

function TracesExplorer(): JSX.Element {
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();

	const urlQuery = useUrlQuery();
	const history = useHistory();
	const location = useLocation();

	const currentUrlTab = urlQuery.get(
		CURRENT_TRACES_EXPLORER_TAB,
	) as TracesExplorerTabs;
	const currentTab = currentUrlTab || TracesExplorerTabs.TIME_SERIES;
	const tabsItems = useMemo(() => getTabsItems(currentQuery), [currentQuery]);

	const redirectWithCurrentTab = useCallback(
		(tabKey: string): void => {
			urlQuery.set(CURRENT_TRACES_EXPLORER_TAB, tabKey);

			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;

			history.push(generatedUrl);
		},
		[history, location, urlQuery],
	);

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
		const currentUrlQuery = urlQuery.get(COMPOSITE_QUERY);

		if (currentUrlQuery) return;

		redirectWithQueryBuilderData(initialTracesQuery);
	}, [currentQuery, urlQuery, redirectWithQueryBuilderData]);

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
