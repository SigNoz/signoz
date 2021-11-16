import { Space, Table, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table/Table';
import ROUTES from 'constants/routes';
import convertDateToAmAndPm from 'lib/convertDateToAmAndPm';
import getFormattedDate from 'lib/getFormatedDate';
import history from 'lib/history';
import React from 'react';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { pushDStree } from 'types/api/trace/getSpans';
import { TraceReducer } from 'types/reducer/trace';
import { isOnboardingSkipped } from 'utils/app';

import { TitleContainer } from './styles';

const TraceDetails = (): JSX.Element => {
	const { spanList } = useSelector<AppState, TraceReducer>(
		(state) => state.trace,
	);

	const spans: TableDataSourceItem[] = spanList[0]?.events?.map(
		(item: (number | string | string[] | pushDStree[])[], index) => {
			if (
				typeof item[0] === 'number' &&
				typeof item[4] === 'string' &&
				typeof item[6] === 'string' &&
				typeof item[1] === 'string' &&
				typeof item[2] === 'string' &&
				typeof item[3] === 'string'
			) {
				return {
					startTime: item[0],
					operationName: item[4],
					duration: parseInt(item[6]),
					spanid: item[1],
					traceid: item[2],
					key: index.toString(),
					service: item[3],
				};
			}
			return {
				duration: 0,
				key: '',
				operationName: '',
				service: '',
				spanid: '',
				startTime: 0,
				traceid: '',
			};
		},
	);

	const columns: ColumnsType<TableDataSourceItem> = [
		{
			title: 'Start Time',
			dataIndex: 'startTime',
			key: 'startTime',
			sorter: (a, b): number => a.startTime - b.startTime,
			sortDirections: ['descend', 'ascend'],
			render: (value: number): string => {
				const date = new Date(value);
				const result = `${getFormattedDate(date)} ${convertDateToAmAndPm(date)}`;
				return result;
			},
		},
		{
			title: 'Service',
			dataIndex: 'service',
			key: 'service',
		},
		{
			title: 'Operation',
			dataIndex: 'operationName',
			key: 'operationName',
		},
		{
			title: 'Duration (in ms)',
			dataIndex: 'duration',
			key: 'duration',
			sorter: (a, b): number => a.duration - b.duration,
			sortDirections: ['descend', 'ascend'],
			render: (value: number): string => (value / 1000000).toFixed(2),
		},
	];

	if (isOnboardingSkipped() && spans?.length === 0) {
		return (
			<Space style={{ width: '100%', margin: '40px 0', justifyContent: 'center' }}>
				No spans found. Please add instrumentation (follow this
				<a
					href={'https://signoz.io/docs/instrumentation/overview'}
					target={'_blank'}
					rel="noreferrer"
				>
					guide
				</a>
				)
			</Space>
		);
	}

	if (spans?.length === 0) {
		return <Typography> No spans found for given filter!</Typography>;
	}

	return (
		<>
			<TitleContainer>List of filtered spans</TitleContainer>

			<Table
				dataSource={spans}
				columns={columns}
				size="middle"
				onRow={(
					record: TableDataSourceItem,
				): React.HTMLAttributes<HTMLElement> => ({
					onClick: (): void => {
						history.push({
							pathname: ROUTES.TRACES + '/' + record.traceid,
							state: {
								spanId: record.spanid,
							},
						});
					},
				})}
			/>
		</>
	);
};

export interface TableDataSourceItem {
	key: string;
	spanid: string;
	traceid: string;
	operationName: string;
	startTime: number;
	duration: number;
	service: string;
}

export default TraceDetails;
