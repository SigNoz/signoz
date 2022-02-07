import { Button, Table, Tooltip } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { METRICS_PAGE_QUERY_PARAM } from 'constants/query';
import ROUTES from 'constants/routes';
import React from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';
import { topEndpointListItem } from 'store/actions/MetricsActions';
import { AppState } from 'store/reducers';
import { GlobalReducer } from 'types/reducer/globalTime';

const TopEndpointsTable = (props: TopEndpointsTableProps): JSX.Element => {
	const { minTime, maxTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const history = useHistory();
	const params = useParams<{ servicename: string }>();

	const handleOnClick = (operation: string): void => {
		const urlParams = new URLSearchParams();
		const { servicename } = params;
		urlParams.set(
			METRICS_PAGE_QUERY_PARAM.startTime,
			(minTime / 1000000).toString(),
		);
		urlParams.set(
			METRICS_PAGE_QUERY_PARAM.endTime,
			(maxTime / 1000000).toString(),
		);

		history.push(
			`${
				ROUTES.TRACE
			}?${urlParams.toString()}&selected={"status":["error","ok"],"serviceName":["${servicename}"],"operation":["${operation}"]}&filterToFetchData=["duration","status","serviceName","operation"]&isSelectedFilterSkipped=true&userSelectedFilter={"status":["error","ok"],"serviceName":["${servicename}"],"operation":["${operation}"]}&isSelectedFilterSkipped=true`,
		);
	};

	const columns: ColumnsType<DataProps> = [
		{
			title: 'Name',
			dataIndex: 'name',
			key: 'name',

			// eslint-disable-next-line react/display-name
			render: (text: string): JSX.Element => (
				<Tooltip placement="topLeft" title={text}>
					<Button
						className="topEndpointsButton"
						type="link"
						onClick={(): void => handleOnClick(text)}
					>
						{text}
					</Button>
				</Tooltip>
			),
		},
		{
			title: 'P50  (in ms)',
			dataIndex: 'p50',
			key: 'p50',
			sorter: (a: DataProps, b: DataProps): number => a.p50 - b.p50,
			render: (value: number): string => (value / 1000000).toFixed(2),
		},
		{
			title: 'P95  (in ms)',
			dataIndex: 'p95',
			key: 'p95',
			sorter: (a: DataProps, b: DataProps): number => a.p95 - b.p95,
			render: (value: number): string => (value / 1000000).toFixed(2),
		},
		{
			title: 'P99  (in ms)',
			dataIndex: 'p99',
			key: 'p99',
			sorter: (a: DataProps, b: DataProps): number => a.p99 - b.p99,
			render: (value: number): string => (value / 1000000).toFixed(2),
		},
		{
			title: 'Number of Calls',
			dataIndex: 'numCalls',
			key: 'numCalls',
			sorter: (a: topEndpointListItem, b: topEndpointListItem): number =>
				a.numCalls - b.numCalls,
		},
	];

	return (
		<Table
			showHeader
			title={(): string => {
				return 'Top Endpoints';
			}}
			dataSource={props.data}
			columns={columns}
			pagination={false}
			rowKey="name"
		/>
	);
};

type DataProps = topEndpointListItem;

interface TopEndpointsTableProps {
	data: topEndpointListItem[];
}

export default TopEndpointsTable;
