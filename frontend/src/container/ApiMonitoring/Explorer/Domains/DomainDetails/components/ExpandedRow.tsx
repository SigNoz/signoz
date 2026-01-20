import { LoadingOutlined } from '@ant-design/icons';
import { Spin, Table } from 'antd';
import { ColumnType } from 'antd/lib/table';
import logEvent from 'api/common/logEvent';
import { ENTITY_VERSION_V4 } from 'constants/app';
import { REACT_QUERY_KEY } from 'constants/reactQueryKeys';
import {
	createFiltersForSelectedRowData,
	EndPointsTableRowData,
	formatEndPointsDataForTable,
	getEndPointsColumnsConfig,
	getEndPointsQueryPayload,
} from 'container/ApiMonitoring/utils';
import LoadingContainer from 'container/InfraMonitoringK8s/LoadingContainer';
import { GetMetricQueryRange } from 'lib/dashboard/getQueryResults';
import { useMemo } from 'react';
import { useQueries } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { SuccessResponse } from 'types/api';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { OrderByPayload } from 'types/api/queryBuilder/queryBuilderData';
import { GlobalReducer } from 'types/reducer/globalTime';

import { VIEW_TYPES, VIEWS } from '../constants';

function ExpandedRow({
	domainName,
	selectedRowData,
	setSelectedEndPointName,
	setSelectedView,
	orderBy,
}: {
	domainName: string;
	selectedRowData: EndPointsTableRowData;
	setSelectedEndPointName: (name: string) => void;
	setSelectedView: (view: VIEWS) => void;
	orderBy: OrderByPayload | null;
}): JSX.Element {
	const nestedColumns = useMemo(() => getEndPointsColumnsConfig(false, []), []);
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const groupedByRowDataQueryPayload = useMemo(() => {
		if (!selectedRowData) return null;

		const filters = createFiltersForSelectedRowData(selectedRowData);

		const baseQueryPayload = getEndPointsQueryPayload(
			[],
			domainName,
			Math.floor(minTime / 1e9),
			Math.floor(maxTime / 1e9),
		);

		return baseQueryPayload.map((currentQueryPayload) => ({
			...currentQueryPayload,
			query: {
				...currentQueryPayload.query,
				builder: {
					...currentQueryPayload.query.builder,
					queryData: currentQueryPayload.query.builder.queryData.map(
						(queryData) => ({
							...queryData,
							filters: {
								items: [...(queryData.filters?.items || []), ...(filters?.items || [])],
								op: 'AND',
							},
						}),
					),
				},
			},
		}));
	}, [domainName, minTime, maxTime, selectedRowData]);

	const groupedByRowQueries = useQueries(
		groupedByRowDataQueryPayload
			? groupedByRowDataQueryPayload.map((payload) => ({
					queryKey: [
						`${REACT_QUERY_KEY.GET_NESTED_ENDPOINTS_LIST}-${domainName}-${selectedRowData?.key}`,
						payload,
						ENTITY_VERSION_V4,
						selectedRowData?.key,
					],
					queryFn: (): Promise<SuccessResponse<MetricRangePayloadProps>> =>
						GetMetricQueryRange(payload, ENTITY_VERSION_V4),
					enabled: !!payload && !!selectedRowData,
			  }))
			: [],
	);

	const groupedByRowQuery = groupedByRowQueries[0];
	return (
		<div className="expanded-table-container">
			{groupedByRowQuery?.isFetching || groupedByRowQuery?.isLoading ? (
				<LoadingContainer />
			) : (
				<div className="expanded-table">
					<Table
						columns={nestedColumns as ColumnType<EndPointsTableRowData>[]}
						dataSource={
							groupedByRowQuery?.data
								? formatEndPointsDataForTable(
										groupedByRowQuery.data?.payload.data.result[0].table?.rows,
										[],
										orderBy,
								  )
								: []
						}
						pagination={false}
						scroll={{ x: true }}
						tableLayout="fixed"
						showHeader={false}
						loading={{
							spinning: groupedByRowQuery?.isFetching || groupedByRowQuery?.isLoading,
							indicator: <Spin indicator={<LoadingOutlined size={14} spin />} />,
						}}
						onRow={(record): { onClick: () => void; className: string } => ({
							onClick: (): void => {
								setSelectedEndPointName(record.endpointName);
								setSelectedView(VIEW_TYPES.ENDPOINT_STATS);
								logEvent('API Monitoring: Endpoint name row clicked', {});
							},
							className: 'expanded-clickable-row',
						})}
					/>
				</div>
			)}
		</div>
	);
}

export default ExpandedRow;
