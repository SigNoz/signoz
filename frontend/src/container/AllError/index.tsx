import { notification, Table, TableProps, Tooltip, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import getAll from 'api/errors/getAll';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { Exception } from 'types/api/errors/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';

import {
	getDefaultOrder,
	getNanoSeconds,
	getOffSet,
	getOrder,
	getOrderParams,
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

	const updatedPath = useMemo(
		() =>
			`${pathname}?${createQueryParams({
				order: updatedOrder,
				offset: getUpdatedOffset,
				orderParam: getUpdatedParams,
			})}`,
		[pathname, updatedOrder, getUpdatedOffset, getUpdatedParams],
	);

	const { isLoading, data } = useQuery(
		['getAllError', [maxTime, minTime, updatedPath]],
		{
			queryFn: () =>
				getAll({
					end: maxTime,
					start: minTime,
					order: getOrder(params.get(urlKey.order)),
					limit: 10,
					offset: getOffSet(params.get(urlKey.offset)),
					orderParam: getOrderParams(params.get(urlKey.orderParam)),
				}),
			enabled: !loading,
		},
	);

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
			const { current = 0 } = paginations;
			const { columnKey = '', order } = sorter;
			const updatedOrder = order === 'ascend' ? 'ascending' : 'descending';

			history.replace(
				`${pathname}?${createQueryParams({
					order: updatedOrder,
					offset: current - 1,
					orderParam: columnKey,
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
			loading={isLoading || false}
			pagination={{
				pageSize: 10,
				responsive: true,
				current: getUpdatedOffset + 1,
				position: ['bottomLeft'],
				total: 20,
			}}
			onChange={onChangeHandler}
		/>
	);
}

export default AllErrors;
