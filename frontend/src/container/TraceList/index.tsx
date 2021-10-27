import { Space, Table, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table/Table';
import ROUTES from 'constants/routes';
import convertDateToAmAndPm from 'lib/convertDateToAmAndPm';
import getFormattedDate from 'lib/getFormatedDate';
import history from 'lib/history';
import React from 'react';
import { isOnboardingSkipped } from 'utils/app';

import { TitleContainer } from './styles';

const TraceDetails = ({ spans }: TraceDetailsProps): JSX.Element => {
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

	if (spans.length === 0) {
		return <Typography> No spans found for given filter!</Typography>;
	}

	if (isOnboardingSkipped()) {
		return (
			<Space style={{ width: '100%', margin: '40px 0', justifyContent: 'center' }}>
				No spans found. Please add instrumentation (follow this
				<a
					href={'https://signoz.io/docs/instrumentation/overview'}
					target={'_blank'}
					style={{ marginLeft: 3 }}
					rel="noreferrer"
				>
					guide
				</a>
				)
			</Space>
		);
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

interface TraceDetailsProps {
	spans: TableDataSourceItem[];
}

export default TraceDetails;
