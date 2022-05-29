import { notification, Table, Tooltip, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import getAll from 'api/errors/getAll';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { Exception } from 'types/api/errors/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';

function AllErrors(): JSX.Element {
	const { maxTime, minTime } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);

	const { t } = useTranslation(['common']);

	const { isLoading, data } = useQuery(['getAllError', [maxTime, minTime]], {
		queryFn: () =>
			getAll({
				end: maxTime,
				start: minTime,
			}),
	});

	useEffect(() => {
		if (data?.error) {
			notification.error({
				message: data.error || t('something_went_wrong'),
			});
		}
	}, [data?.error, data?.payload, t]);

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
				<Tooltip overlay={(): JSX.Element => value}>
					<Link
						to={`${ROUTES.ERROR_DETAIL}?serviceName=${record.serviceName}&errorType=${record.exceptionType}`}
					>
						{value}
					</Link>
				</Tooltip>
			),
			sorter: (a, b): number =>
				a.exceptionType.charCodeAt(0) - b.exceptionType.charCodeAt(0),
		},
		{
			title: 'Error Message',
			dataIndex: 'exceptionMessage',
			key: 'exceptionMessage',
			render: (value): JSX.Element => (
				<Tooltip overlay={(): JSX.Element => value}>
					<Typography.Paragraph
						ellipsis={{
							rows: 2,
						}}
					>
						{value}
					</Typography.Paragraph>
				</Tooltip>
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
				dayjs(b.lastSeen).isBefore(dayjs(a.lastSeen)) === true ? 1 : 0,
		},
		{
			title: 'First Seen',
			dataIndex: 'firstSeen',
			key: 'firstSeen',
			render: getDateValue,
			sorter: (a, b): number =>
				dayjs(b.firstSeen).isBefore(dayjs(a.firstSeen)) === true ? 1 : 0,
		},
		{
			title: 'Application',
			dataIndex: 'serviceName',
			key: 'serviceName',
			sorter: (a, b): number =>
				a.serviceName.charCodeAt(0) - b.serviceName.charCodeAt(0),
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
