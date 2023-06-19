import { Tabs } from 'antd';
import { initialQueriesMap } from 'constants/queryBuilder';
import QuerySection from 'container/TracesExplorer/QuerySection';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { CURRENT_TRACES_EXPLORER_TAB, TracesExplorerTabs } from './constants';
import { Container } from './styles';
import { getTabsItems } from './utils';

function TracesExplorer(): JSX.Element {
	const urlQuery = useUrlQuery();
	const history = useHistory();
	const location = useLocation();

	const currentUrlTab = urlQuery.get(
		CURRENT_TRACES_EXPLORER_TAB,
	) as TracesExplorerTabs;
	const currentTab = currentUrlTab || TracesExplorerTabs.TIME_SERIES;
	const tabsItems = getTabsItems();

	const redirectWithCurrentTab = useCallback(
		(tabKey: string): void => {
			urlQuery.set(CURRENT_TRACES_EXPLORER_TAB, tabKey);
			const generatedUrl = `${location.pathname}?${urlQuery.toString()}`;
			history.push(generatedUrl);
		},
		[history, location, urlQuery],
	);

	const handleTabChange = useCallback(
		(tabKey: string): void => {
			redirectWithCurrentTab(tabKey);
		},
		[redirectWithCurrentTab],
	);

	useShareBuilderUrl({ defaultValue: initialQueriesMap.traces });

	useEffect(() => {
		if (currentUrlTab) return;

		redirectWithCurrentTab(TracesExplorerTabs.TIME_SERIES);
	}, [currentUrlTab, redirectWithCurrentTab]);

	return (
		<>
			<QuerySection />

			<Container>
				<Tabs activeKey={currentTab} items={tabsItems} onChange={handleTabChange} />
			</Container>
		</>
	);
}

export default TracesExplorer;
