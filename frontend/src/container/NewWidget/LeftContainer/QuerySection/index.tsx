import { Button, Tabs, Typography } from 'antd';
import TextToolTip from 'components/TextToolTip';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { WidgetGraphProps } from 'container/NewWidget/types';
import { QueryBuilder } from 'container/QueryBuilder';
import { QueryBuilderProps } from 'container/QueryBuilder/QueryBuilder.interfaces';
import { useGetWidgetQueryRange } from 'hooks/queryBuilder/useGetWidgetQueryRange';
import { useQueryBuilder } from 'hooks/queryBuilder/useQueryBuilder';
import { useShareBuilderUrl } from 'hooks/queryBuilder/useShareBuilderUrl';
import { updateStepInterval } from 'hooks/queryBuilder/useStepInterval';
import useUrlQuery from 'hooks/useUrlQuery';
import { useCallback, useMemo } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators, Dispatch } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	UpdateQuery,
	UpdateQueryProps,
} from 'store/actions/dashboard/updateQuery';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { Widgets } from 'types/api/dashboard/getAll';
import { Query } from 'types/api/queryBuilder/queryBuilderData';
import { EQueryType } from 'types/common/dashboard';
import AppReducer from 'types/reducer/app';
import DashboardReducer from 'types/reducer/dashboards';
import { GlobalReducer } from 'types/reducer/globalTime';

import ClickHouseQueryContainer from './QueryBuilder/clickHouse';
import PromQLQueryContainer from './QueryBuilder/promQL';

function QuerySection({
	updateQuery,
	selectedGraph,
	selectedTime,
}: QueryProps): JSX.Element {
	const { currentQuery, redirectWithQueryBuilderData } = useQueryBuilder();
	const urlQuery = useUrlQuery();

	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { featureResponse } = useSelector<AppState, AppReducer>(
		(state) => state.app,
	);

	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);

	const getWidgetQueryRange = useGetWidgetQueryRange({
		graphType: selectedGraph,
		selectedTime: selectedTime.enum,
	});

	const [selectedDashboards] = dashboards;
	const { widgets } = selectedDashboards.data;

	const getWidget = useCallback(() => {
		const widgetId = urlQuery.get('widgetId');
		return widgets?.find((e) => e.id === widgetId);
	}, [widgets, urlQuery]);

	const selectedWidget = getWidget() as Widgets;

	const { query } = selectedWidget;

	useShareBuilderUrl(query);

	const handleStageQuery = useCallback(
		(updatedQuery: Query): void => {
			updateQuery({
				widgetId: urlQuery.get('widgetId') || '',
				yAxisUnit: selectedWidget.yAxisUnit,
			});

			redirectWithQueryBuilderData(
				updateStepInterval(updatedQuery, maxTime, minTime),
			);
		},

		[
			updateQuery,
			urlQuery,
			selectedWidget.yAxisUnit,
			redirectWithQueryBuilderData,
			maxTime,
			minTime,
		],
	);

	const handleQueryCategoryChange = (qCategory: string): void => {
		const currentQueryType = qCategory as EQueryType;

		featureResponse.refetch().then(() => {
			handleStageQuery({ ...currentQuery, queryType: currentQueryType });
		});
	};

	const handleRunQuery = (): void => {
		handleStageQuery(currentQuery);
	};

	const filterConfigs: QueryBuilderProps['filterConfigs'] = useMemo(() => {
		const config: QueryBuilderProps['filterConfigs'] = {
			stepInterval: { isHidden: false, isDisabled: true },
		};

		return config;
	}, []);

	const items = [
		{
			key: EQueryType.QUERY_BUILDER,
			label: 'Query Builder',
			tab: <Typography>Query Builder</Typography>,
			children: (
				<QueryBuilder panelType={selectedGraph} filterConfigs={filterConfigs} />
			),
		},
		{
			key: EQueryType.CLICKHOUSE,
			label: 'ClickHouse Query',
			tab: <Typography>ClickHouse Query</Typography>,
			children: <ClickHouseQueryContainer />,
		},
		{
			key: EQueryType.PROM,
			label: 'PromQL',
			tab: <Typography>PromQL</Typography>,
			children: <PromQLQueryContainer />,
		},
	];

	return (
		<Tabs
			type="card"
			style={{ width: '100%' }}
			defaultActiveKey={currentQuery.queryType}
			activeKey={currentQuery.queryType}
			onChange={handleQueryCategoryChange}
			tabBarExtraContent={
				<span style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
					<TextToolTip text="This will temporarily save the current query and graph state. This will persist across tab change" />
					<Button
						loading={getWidgetQueryRange.isFetching}
						type="primary"
						onClick={handleRunQuery}
					>
						Stage & Run Query
					</Button>
				</span>
			}
			items={items}
		/>
	);
}

interface DispatchProps {
	updateQuery: (
		props: UpdateQueryProps,
	) => (dispatch: Dispatch<AppActions>) => void;
}

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	updateQuery: bindActionCreators(UpdateQuery, dispatch),
});

interface QueryProps extends DispatchProps {
	selectedGraph: PANEL_TYPES;
	selectedTime: WidgetGraphProps['selectedTime'];
}

export default connect(null, mapDispatchToProps)(QuerySection);
