import { Table, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import getAll from 'api/errors/getAll';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import React from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { generatePath, Link } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { Exception } from 'types/api/errors/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';

function AllErrors(): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { isLoading, data } = useQuery(['getAllError', [maxTime, minTime]], {
		queryFn: () =>
			getAll({
				end: maxTime,
				start: minTime,
			}),
	});

	const getDateValue = (value: string): JSX.Element => {
		return (
			<Typography>{dayjs(value).format('DD/MM/YYYY HH:mm:ss A')}</Typography>
		);
	};

	const columns: ColumnsType<Exception> = [
		{
			title: 'Exception Type',
			dataIndex: 'exceptionType',
			key: 'exceptionType',
			render: (value, record): JSX.Element => (
				<Link
					to={generatePath(ROUTES.ERROR_DETAIL, {
						serviceName: record.serviceName,
						errorType: record.exceptionType,
					})}
				>
					{value}
				</Link>
			),
			sorter: (a, b): number => a.exceptionType.length - b.exceptionType.length,
		},
		{
			title: 'Error Message',
			dataIndex: 'exceptionMessage',
			key: 'exceptionMessage',
			render: (value): JSX.Element => (
				<Typography.Paragraph
					ellipsis={{
						rows: 2,
					}}
				>
					{value}
				</Typography.Paragraph>
			),
		},
		{
			title: 'Count',
			dataIndex: 'exceptionCount',
			key: 'exceptionCount',
			sorter: (a, b): number => a.exceptionCount - b.exceptionCount,
		},
		{
			title: 'Last Seen',
			dataIndex: 'lastSeen',
			key: 'lastSeen',
			render: getDateValue,
			sorter: (a, b): number =>
				dayjs(a.lastSeen).isBefore(dayjs(b.lastSeen)) === true ? 1 : 0,
		},
		{
			title: 'First Seen',
			dataIndex: 'firstSeen',
			key: 'firstSeen',
			render: getDateValue,
			sorter: (a, b): number =>
				dayjs(a.firstSeen).isBefore(dayjs(b.firstSeen)) === true ? 1 : 0,
		},
		{
			title: 'Application',
			dataIndex: 'serviceName',
			key: 'serviceName',
			sorter: (a, b): number => a.serviceName.length - b.serviceName.length,
		},
	];

	return (
		<Table
			tableLayout="fixed"
			dataSource={data?.payload as Exception[]}
			columns={columns}
			loading={isLoading || false}
		/>
	);
}

export default AllErrors;
