import './QuerySection.styles.scss';

import { Color } from '@signozhq/design-tokens';
import { Button, Tabs, Typography } from 'antd';
import logEvent from 'api/common/logEvent';
import PromQLIcon from 'assets/Dashboard/PromQl';
import TextToolTip from 'components/TextToolTip';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { QBShortcuts } from 'constants/shortcuts/QBShortcuts';
import {
	getDefaultWidgetData,
	PANEL_TYPE_TO_QUERY_TYPES,
} from 'container/NewWidget/utils';
import { QueryBuilder } from 'container/QueryBuilder';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useKeyboardHotkeys } from 'hooks/hotkeys/useKeyboardHotkeys';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { useIsDarkMode } from 'hooks/useDarkMode';
import useUrlQuery from 'hooks/useUrlQuery';
import { defaultTo, isUndefined } from 'lodash-es';
import { Atom, Play, Terminal } from 'lucide-react';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import {
	getNextWidgets,
	getPreviousWidgets,
	getSelectedWidgetIndex,
} from 'providers/Dashboard/util';
import { useCallback, useEffect, useMemo } from 'react';
import { UseQueryResult } from 'react-query';
import { SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';

import ClickHouseQueryContainer from './QueryBuilder/clickHouse';
import PromQLQueryContainer from './QueryBuilder/promQL';

function QuerySection({
	selectedGraph,
	queryResponse,
}: QueryProps): JSX.Element {
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const urlQuery = useUrlQuery();
	const { registerShortcut, deregisterShortcut } = useKeyboardHotkeys();

	const { selectedDashboard, setSelectedDashboard } = useDashboard();

	const isDarkMode = useIsDarkMode();

	const { widgets } = selectedDashboard?.data || {};

	const getWidget = useCallback(() => {
		const widgetId = urlQuery.get('widgetId');
		return defaultTo(
			widgets?.find((e) => e.id === widgetId),
			getDefaultWidgetData(widgetId || '', selectedGraph),
		);
	}, [urlQuery, widgets, selectedGraph]);

	const selectedWidget = getWidget() as Widgets;

	const { query } = selectedWidget;

	useShareBuilderUrl(query);

	const handleStageQuery = useCallback(
		(query: Query): void => {
			if (selectedDashboard === undefined) {
				return;
			}

			const selectedWidgetIndex = getSelectedWidgetIndex(
				selectedDashboard,
				selectedWidget.id,
			);

			const previousWidgets = getPreviousWidgets(
				selectedDashboard,
				selectedWidgetIndex,
			);

			const nextWidgets = getNextWidgets(selectedDashboard, selectedWidgetIndex);

			setSelectedDashboard({
				...selectedDashboard,
				data: {
					...selectedDashboard?.data,
					widgets: [
						...previousWidgets,
						{
							...selectedWidget,
							query,
						},
						...nextWidgets,
					],
				},
			});
			redirectWithQueryBuilderData(query);
		},
		[
			selectedDashboard,
			selectedWidget,
			setSelectedDashboard,
			redirectWithQueryBuilderData,
		],
	);

	const handleQueryCategoryChange = useCallback(
		(qCategory: string): void => {
			const currentQueryType = qCategory;
			handleStageQuery({
				...currentQuery,
				queryType: currentQueryType as EQueryType,
			});
		},
		[currentQuery, handleStageQuery],
	);

	const handleRunQuery = (): void => {
		const widgetId = urlQuery.get('widgetId');
		const isNewPanel = isUndefined(widgets?.find((e) => e.id === widgetId));

		logEvent('Panel Edit: Stage and run query', {
			dataSource: currentQuery.builder?.queryData?.[0]?.dataSource,
			panelType: selectedWidget.panelTypes,
			queryType: currentQuery.queryType,
			widgetId: selectedWidget.id,
			dashboardId: selectedDashboard?.uuid,
			dashboardName: selectedDashboard?.data.title,
			isNewPanel,
		});
		handleStageQuery(currentQuery);
	};

	const filterConfigs: QueryBuilderProps['filterConfigs'] = useMemo(() => {
		const config: QueryBuilderProps['filterConfigs'] = {
			stepInterval: { isHidden: false, isDisabled: false },
		};

		return config;
	}, []);

	const items = useMemo(() => {
		const supportedQueryTypes = PANEL_TYPE_TO_QUERY_TYPES[selectedGraph] || [];

		const queryTypeComponents = {
			[EQueryType.QUERY_BUILDER]: {
				icon: <Atom size={14} />,
				label: 'Query Builder',
				component: (
					<QueryBuilder
						panelType={selectedGraph}
						filterConfigs={filterConfigs}
						version={selectedDashboard?.data?.version || 'v3'}
						isListViewPanel={selectedGraph === PANEL_TYPES.LIST}
					/>
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
		selectedGraph,
		filterConfigs,
		selectedDashboard?.data?.version,
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
						<TextToolTip
							text="This will temporarily save the current query and graph state. This will persist across tab change"
							url="https://signoz.io/docs/userguide/query-builder?utm_source=product&utm_medium=query-builder"
						/>
						<Button
							loading={queryResponse.isFetching}
							type="primary"
							onClick={handleRunQuery}
							className="stage-run-query"
							icon={<Play size={14} />}
						>
							Stage & Run Query
						</Button>
					</span>
				}
				items={items}
			/>
		</div>
	);
}

interface QueryProps {
	selectedGraph: PANEL_TYPES;
	queryResponse: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown>,
		Error
	>;
}

export default QuerySection;
