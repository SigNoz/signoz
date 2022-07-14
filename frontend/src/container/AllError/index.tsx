import { notification, Table, TableProps, Tooltip, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import getAll from 'api/errors/getAll';
import getErrorCounts from 'api/errors/getErrorCounts';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueries } from 'react-query';
import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Exception, PayloadProps } from 'types/api/errors/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	getDefaultOrder,
	getNanoSeconds,
	getOffSet,
	getOrder,
	getOrderParams,
	getUpdatePageSize,
	urlKey,
} from './utils';

function AllErrors(): JSX.Element {
	const { maxTime, minTime, loading } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { search, pathname } = useLocation();
	const params = useMemo(() => new URLSearchParams(search), [search]);

	const { t } = useTranslation(['common']);

	const updatedOrder = getOrder(params.get(urlKey.order));
	const getUpdatedOffset = getOffSet(params.get(urlKey.offset));
	const getUpdatedParams = getOrderParams(params.get(urlKey.orderParam));
	const getUpdatedPageSize = getUpdatePageSize(params.get(urlKey.pageSize));

	const updatedPath = useMemo(
		() =>
			`${pathname}?${createQueryParams({
				order: updatedOrder,
				offset: getUpdatedOffset,
				orderParam: getUpdatedParams,
				pageSize: getUpdatedPageSize,
			})}`,
		[
			pathname,
			updatedOrder,
			getUpdatedOffset,
			getUpdatedParams,
			getUpdatedPageSize,
		],
	);

	const [{ isLoading, data }, errorCountResponse] = useQueries([
		{
			queryKey: ['getAllErrors', updatedPath, maxTime, minTime],
			queryFn: (): Promise<SuccessResponse<PayloadProps> | ErrorResponse> =>
				getAll({
					end: maxTime,
					start: minTime,
					order: updatedOrder,
					limit: getUpdatedPageSize,
					offset: getUpdatedOffset,
					orderParam: getUpdatedParams,
				}),
			enabled: !loading,
		},
		{
			queryKey: ['getErrorCounts', maxTime, minTime],
			queryFn: (): Promise<ErrorResponse | SuccessResponse<number>> =>
				getErrorCounts({
					end: maxTime,
					start: minTime,
				}),
		},
	]);

	useEffect(() => {
		if (data?.error) {
			notification.error({
				message: data.error || t('something_went_wrong'),
			});
		}
	}, [data?.error, data?.payload, t]);

	const getDateValue = (value: string): JSX.Element => (
		<Typography>{dayjs(value).format('DD/MM/YYYY HH:mm:ss A')}</Typography>
	);

	const columns: ColumnsType<Exception> = [
		{
			title: 'Exception Type',
			dataIndex: 'exceptionType',
			key: 'exceptionType',
			render: (value, record): JSX.Element => (
				<Tooltip overlay={(): JSX.Element => value}>
					<Link
						to={`${ROUTES.ERROR_DETAIL}?serviceName=${
							record.serviceName
						}&exceptionType=${record.exceptionType}&groupId=${
							record.groupID
						}&timestamp=${getNanoSeconds(record.lastSeen)}`}
					>
						{value}
					</Link>
				</Tooltip>
			),
			sorter: true,
			defaultSortOrder: getDefaultOrder(
				getUpdatedParams,
				updatedOrder,
				'exceptionType',
			),
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
			sorter: true,
			defaultSortOrder: getDefaultOrder(
				getUpdatedParams,
				updatedOrder,
				'exceptionCount',
			),
		},
		{
			title: 'Last Seen',
			dataIndex: 'lastSeen',
			key: 'lastSeen',
			render: getDateValue,
			sorter: true,
			defaultSortOrder: getDefaultOrder(
				getUpdatedParams,
				updatedOrder,
				'lastSeen',
			),
		},
		{
			title: 'First Seen',
			dataIndex: 'firstSeen',
			key: 'firstSeen',
			render: getDateValue,
			sorter: true,
			defaultSortOrder: getDefaultOrder(
				getUpdatedParams,
				updatedOrder,
				'firstSeen',
			),
		},
		{
			title: 'Application',
			dataIndex: 'serviceName',
			key: 'serviceName',
			sorter: true,
			defaultSortOrder: getDefaultOrder(
				getUpdatedParams,
				updatedOrder,
				'serviceName',
			),
		},
	];

	const onChangeHandler: TableProps<Exception>['onChange'] = (
		paginations,
		_,
		sorter,
	) => {
		if (!Array.isArray(sorter)) {
			const { pageSize = 0, current = 0 } = paginations;
			const { columnKey = '', order } = sorter;
			const updatedOrder = order === 'ascend' ? 'ascending' : 'descending';

			history.replace(
				`${pathname}?${createQueryParams({
					order: updatedOrder,
					offset: (current - 1) * pageSize,
					orderParam: columnKey,
					pageSize,
				})}`,
			);
		}
	};

	return (
		<Table
			tableLayout="fixed"
			dataSource={data?.payload as Exception[]}
			columns={columns}
			rowKey="firstSeen"
			loading={isLoading || false || errorCountResponse.status === 'loading'}
			pagination={{
				pageSize: getUpdatedPageSize,
				responsive: true,
				current: getUpdatedOffset / 10 + 1,
				position: ['bottomLeft'],
				total: errorCountResponse.data?.payload || 0,
			}}
			onChange={onChangeHandler}
		/>
	);
}

export default AllErrors;
