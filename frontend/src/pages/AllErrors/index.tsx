import { Table, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import getAll from 'api/errors/getAll';
import ROUTES from 'constants/routes';
import useFetch from 'hooks/useFetch';
import React from 'react';
import { useSelector } from 'react-redux';
import { generatePath, Link } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { Exception, PayloadProps, Props } from 'types/api/errors/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';

function AllErrors(): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { loading, payload } = useFetch<PayloadProps, Props>(getAll, {
		end: maxTime,
		start: minTime,
	});

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
		},
		{
			title: 'Last Seen',
			dataIndex: 'lastSeen',
			key: 'lastSeen',
		},
		{
			title: 'First Seen',
			dataIndex: 'firstSeen',
			key: 'firstSeen',
		},
		{
			title: 'Application',
			dataIndex: 'serviceName',
			key: 'serviceName',
		},
	];

	return (
		<Table
			tableLayout="fixed"
			dataSource={payload}
			columns={columns}
			loading={loading || false}
		/>
	);
}

export default AllErrors;
