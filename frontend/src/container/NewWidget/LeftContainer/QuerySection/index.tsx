import { useCallback, useEffect, useMemo } from 'react';
import { Color } from '@signozhq/design-tokens';
import { Button, Tabs, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import PromQLIcon from 'assets/Dashboard/PromQl';
import { QueryBuilderV2 } from 'components/QueryBuilderV2/QueryBuilderV2';
import TextToolTip from 'components/TextToolTip';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QBShortcuts } from 'constants/shortcuts/QBShortcuts';
import { PANEL_TYPE_TO_QUERY_TYPES } from 'container/NewWidget/utils';
import RunQueryBtn from 'container/QueryBuilder/components/RunQueryBtn/RunQueryBtn';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useKeyboardHotkeys } from 'hooks/hotkeys/useKeyboardHotkeys';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { useIsDarkMode } from 'hooks/useDarkMode';
import { Atom, Terminal } from 'lucide-react';
import { Widgets } from 'types/api/dashboard/getAll';
import { EQueryType } from 'types/common/dashboard';

import ClickHouseQueryContainer from './QueryBuilder/clickHouse';
import PromQLQueryContainer from './QueryBuilder/promQL';

import './QuerySection.styles.scss';
function QuerySection({
	selectedGraph,
	isLoadingQueries,
	handleCancelQuery,
	selectedWidget,
	dashboardVersion,
	dashboardId,
	dashboardName,
	isNewPanel,
}: QueryProps): JSX.Element {
	const {
		currentQuery,
		handleRunQuery: handleRunQueryFromQueryBuilder,
		redirectWithQueryBuilderData,
	} = useQueryBuilder();
	const { registerShortcut, deregisterShortcut } = useKeyboardHotkeys();

	const isDarkMode = useIsDarkMode();

	const { query } = selectedWidget;

	useShareBuilderUrl({ defaultValue: query });

	const handleQueryCategoryChange = useCallback(
		(qCategory: string): void => {
			const currentQueryType = qCategory as EQueryType;
			redirectWithQueryBuilderData({
				...currentQuery,
				queryType: currentQueryType,
			});
		},
		[currentQuery, redirectWithQueryBuilderData],
	);

	const handleRunQuery = (): void => {
		logEvent('Panel Edit: Stage and run query', {
			dataSource: currentQuery.builder?.queryData?.[0]?.dataSource,
			panelType: selectedWidget.panelTypes,
			queryType: currentQuery.queryType,
			widgetId: selectedWidget.id,
			dashboardId,
			dashboardName,
			isNewPanel,
		});
		handleRunQueryFromQueryBuilder();
	};

	const filterConfigs: QueryBuilderProps['filterConfigs'] = useMemo(() => {
		const config: QueryBuilderProps['filterConfigs'] = {
			stepInterval: { isHidden: false, isDisabled: false },
		};

		return config;
	}, []);

	const queryComponents = useMemo(
		(): QueryBuilderProps['queryComponents'] => ({}),
		[],
	);

	const items = useMemo(() => {
		const supportedQueryTypes = PANEL_TYPE_TO_QUERY_TYPES[selectedGraph] || [];

		const queryTypeComponents = {
			[EQueryType.QUERY_BUILDER]: {
				icon: <Atom size={14} />,
				label: 'Query Builder',
				component: (
					<div className="query-builder-v2-container">
						<QueryBuilderV2
							panelType={selectedGraph}
							filterConfigs={filterConfigs}
							showTraceOperator={selectedGraph !== PANEL_TYPES.LIST}
							version={dashboardVersion || 'v3'}
							isListViewPanel={selectedGraph === PANEL_TYPES.LIST}
							queryComponents={queryComponents}
							signalSourceChangeEnabled
							savePreviousQuery
						/>
					</div>
				),
			},
			[EQueryType.CLICKHOUSE]: {
				icon: <Terminal size={14} />,
				label: 'ClickHouse Query',
				component: <ClickHouseQueryContainer />,
			},
			[EQueryType.PROM]: {
				icon: (
					<PromQLIcon
						fillColor={isDarkMode ? Color.BG_VANILLA_200 : Color.BG_INK_300}
					/>
				),
				label: 'PromQL',
				component: <PromQLQueryContainer />,
			},
		};

		return supportedQueryTypes.map((queryType) => ({
			key: queryType,
			label: (
				<Button className="nav-btns">
					{queryTypeComponents[queryType].icon}
					<Typography>{queryTypeComponents[queryType].label}</Typography>
				</Button>
			),
			tab: <Typography>{queryTypeComponents[queryType].label}</Typography>,
			children: queryTypeComponents[queryType].component,
		}));
	}, [
		queryComponents,
		selectedGraph,
		filterConfigs,
		dashboardVersion,
		isDarkMode,
	]);

	useEffect(() => {
		registerShortcut(QBShortcuts.StageAndRunQuery, handleRunQuery);

		return (): void => {
			deregisterShortcut(QBShortcuts.StageAndRunQuery);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [handleRunQuery]);

	useEffect(() => {
		// switch to query builder if query type is not supported
		if (
			(selectedGraph === PANEL_TYPES.TABLE || selectedGraph === PANEL_TYPES.PIE) &&
			currentQuery.queryType === EQueryType.PROM
		) {
			handleQueryCategoryChange(EQueryType.QUERY_BUILDER);
		}
	}, [currentQuery, handleQueryCategoryChange, selectedGraph]);

	return (
		<div className="dashboard-navigation">
			<Tabs
				type="card"
				style={{ width: '100%' }}
				defaultActiveKey={
					selectedGraph !== PANEL_TYPES.EMPTY_WIDGET
						? currentQuery.queryType
						: currentQuery.builder.queryData[0].dataSource
				}
				activeKey={currentQuery.queryType}
				onChange={handleQueryCategoryChange}
				tabBarExtraContent={
					<span style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
						<TextToolTip text="This will temporarily save the current query and graph state. This will persist across tab change" />
						<RunQueryBtn
							className="run-query-dashboard-btn"
							label="Stage & Run Query"
							onStageRunQuery={handleRunQuery}
							isLoadingQueries={isLoadingQueries}
							handleCancelQuery={handleCancelQuery}
						/>
					</span>
				}
				items={items}
			/>
		</div>
	);
}

interface QueryProps {
	selectedGraph: PANEL_TYPES;
	isLoadingQueries: boolean;
	handleCancelQuery: () => void;
	selectedWidget: Widgets;
	dashboardVersion?: string;
	dashboardId?: string;
	dashboardName?: string;
	isNewPanel?: boolean;
}

export default QuerySection;
