import './LogsExplorer.styles.scss';

import * as Sentry from '@sentry/react';
import ExplorerCard from 'components/ExplorerCard/ExplorerCard';
import LogExplorerQuerySection from 'container/LogExplorerQuerySection';
import LogsExplorerViews from 'container/LogsExplorerViews';
import LeftToolbarActions from 'container/QueryBuilder/components/ToolbarActions/LeftToolbarActions';
import RightToolbarActions from 'container/QueryBuilder/components/ToolbarActions/RightToolbarActions';
import Toolbar from 'container/Toolbar/Toolbar';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import ErrorBoundaryFallback from 'pages/ErrorBoundaryFallback/ErrorBoundaryFallback';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DataSource } from 'types/common/queryBuilder';

import { WrapperStyled } from './styles';
import { SELECTED_VIEWS } from './utils';

function LogsExplorer(): JSX.Element {
	const [showFrequencyChart, setShowFrequencyChart] = useState(true);
	const [selectedView, setSelectedView] = useState<SELECTED_VIEWS>(
		SELECTED_VIEWS.SEARCH,
	);

	const { handleRunQuery, currentQuery } = useQueryBuilder();

	const listQueryKeyRef = useRef<any>();

	const chartQueryKeyRef = useRef<any>();

	const [isLoadingQueries, setIsLoadingQueries] = useState<boolean>(false);

	const handleToggleShowFrequencyChart = (): void => {
		setShowFrequencyChart(!showFrequencyChart);
	};

	const handleChangeSelectedView = (view: SELECTED_VIEWS): void => {
		setSelectedView(view);
	};

	// Switch to query builder view if there are more than 1 queries
	useEffect(() => {
		if (currentQuery.builder.queryData.length > 1) {
			handleChangeSelectedView(SELECTED_VIEWS.QUERY_BUILDER);
		}
		if (
			currentQuery.builder.queryData.length === 1 &&
			currentQuery.builder.queryData[0].groupBy.length > 0
		) {
			handleChangeSelectedView(SELECTED_VIEWS.QUERY_BUILDER);
		}
	}, [currentQuery.builder.queryData, currentQuery.builder.queryData.length]);

	const isMultipleQueries = useMemo(
		() =>
			currentQuery.builder.queryData?.length > 1 ||
			currentQuery.builder.queryFormulas?.length > 0,
		[currentQuery],
	);

	const isGroupByPresent = useMemo(
		() =>
			currentQuery.builder.queryData?.length === 1 &&
			currentQuery.builder.queryData?.[0]?.groupBy?.length > 0,
		[currentQuery.builder.queryData],
	);

	const toolbarViews = useMemo(
		() => ({
			search: {
				name: 'search',
				label: 'Search',
				disabled: isMultipleQueries || isGroupByPresent,
				show: true,
			},
			queryBuilder: {
				name: 'query-builder',
				label: 'Query Builder',
				disabled: false,
				show: true,
			},
			clickhouse: {
				name: 'clickhouse',
				label: 'Clickhouse',
				disabled: false,
				show: false,
			},
		}),
		[isGroupByPresent, isMultipleQueries],
	);

	return (
		<Sentry.ErrorBoundary fallback={<ErrorBoundaryFallback />}>
			<Toolbar
				showAutoRefresh={false}
				leftActions={
					<LeftToolbarActions
						items={toolbarViews}
						selectedView={selectedView}
						onChangeSelectedView={handleChangeSelectedView}
						onToggleHistrogramVisibility={handleToggleShowFrequencyChart}
						showFrequencyChart={showFrequencyChart}
					/>
				}
				rightActions={
					<RightToolbarActions
						onStageRunQuery={handleRunQuery}
						listQueryKeyRef={listQueryKeyRef}
						chartQueryKeyRef={chartQueryKeyRef}
						isLoadingQueries={isLoadingQueries}
					/>
				}
				showOldCTA
			/>

			<WrapperStyled>
				<div className="log-explorer-query-container">
					<div>
						<ExplorerCard sourcepage={DataSource.LOGS}>
							<LogExplorerQuerySection selectedView={selectedView} />
						</ExplorerCard>
					</div>
					<div className="logs-explorer-views">
						<LogsExplorerViews
							selectedView={selectedView}
							showFrequencyChart={showFrequencyChart}
							listQueryKeyRef={listQueryKeyRef}
							chartQueryKeyRef={chartQueryKeyRef}
							setIsLoadingQueries={setIsLoadingQueries}
						/>
					</div>
				</div>
			</WrapperStyled>
		</Sentry.ErrorBoundary>
	);
}

export default LogsExplorer;
