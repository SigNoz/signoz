import { SearchOutlined } from '@ant-design/icons';
import {
	Button,
	Card,
	Input,
	Space,
	TableProps,
	Tooltip,
	Typography,
} from 'antd';
import { ColumnType, TablePaginationConfig } from 'antd/es/table';
import { FilterValue, SorterResult } from 'antd/es/table/interface';
import { ColumnsType } from 'antd/lib/table';
import { FilterConfirmProps } from 'antd/lib/table/interface';
import logEvent from 'api/common/logEvent';
import getAll from 'api/errors/getAll';
import getErrorCounts from 'api/errors/getErrorCounts';
import { ResizeTable } from 'components/ResizeTable';
import { DATE_TIME_FORMATS } from 'constants/dateTimeFormats';
import ROUTES from 'constants/routes';
import { useGetCompositeQueryParam } from 'hooks/queryBuilder/useGetCompositeQueryParam';
import { useNotifications } from 'hooks/useNotifications';
import useResourceAttribute from 'hooks/useResourceAttribute';
import {
	convertCompositeQueryToTraceSelectedTags,
	getResourceDeploymentKeys,
} from 'hooks/useResourceAttribute/utils';
import { TimestampInput } from 'hooks/useTimezoneFormatter/useTimezoneFormatter';
import useUrlQuery from 'hooks/useUrlQuery';
import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import { isUndefined } from 'lodash-es';
import { useTimezone } from 'providers/Timezone';
import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueries } from 'react-query';
import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Exception, PayloadProps } from 'types/api/errors/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';

import { FeatureKeys } from '../../constants/features';
import { useAppContext } from '../../providers/App/App';
import { FilterDropdownExtendsProps } from './types';
import {
	extractFilterValues,
	getDefaultFilterValue,
	getDefaultOrder,
	getFilterString,
	getFilterValues,
	getNanoSeconds,
	getOffSet,
	getOrder,
	getOrderParams,
	getUpdatePageSize,
	urlKey,
} from './utils';

type QueryParams = {
	order: string;
	offset: number;
	orderParam: string;
	pageSize: number;
	exceptionType?: string;
	serviceName?: string;
	compositeQuery?: string;
};

function AllErrors(): JSX.Element {
	const { maxTime, minTime, loading } = useSelector<AppState, GlobalReducer>(
		(state) => state.globalTime,
	);
	const { pathname } = useLocation();
	const params = useUrlQuery();
	const { t } = useTranslation(['common']);
	const {
		updatedOrder,
		getUpdatedOffset,
		getUpdatedParams,
		getUpdatedPageSize,
		getUpdatedExceptionType,
		getUpdatedServiceName,
		getUpdatedCompositeQuery,
	} = useMemo(
		() => ({
			updatedOrder: getOrder(params.get(urlKey.order)),
			getUpdatedOffset: getOffSet(params.get(urlKey.offset)),
			getUpdatedParams: getOrderParams(params.get(urlKey.orderParam)),
			getUpdatedPageSize: getUpdatePageSize(params.get(urlKey.pageSize)),
			getUpdatedExceptionType: getFilterString(params.get(urlKey.exceptionType)),
			getUpdatedServiceName: getFilterString(params.get(urlKey.serviceName)),
			getUpdatedCompositeQuery: getFilterString(params.get(urlKey.compositeQuery)),
		}),
		[params],
	);

	const updatedPath = useMemo(
		() =>
			`${pathname}?${createQueryParams({
				order: updatedOrder,
				offset: getUpdatedOffset,
				orderParam: getUpdatedParams,
				pageSize: getUpdatedPageSize,
				exceptionType: getUpdatedExceptionType,
				serviceName: getUpdatedServiceName,
			})}`,
		[
			pathname,
			updatedOrder,
			getUpdatedOffset,
			getUpdatedParams,
			getUpdatedPageSize,
			getUpdatedExceptionType,
			getUpdatedServiceName,
		],
	);

	const { queries } = useResourceAttribute();
	const compositeData = useGetCompositeQueryParam();

	const [{ isLoading, data }, errorCountResponse] = useQueries([
		{
			queryKey: ['getAllErrors', updatedPath, maxTime, minTime, compositeData],
			queryFn: (): Promise<SuccessResponse<PayloadProps> | ErrorResponse> =>
				getAll({
					end: maxTime,
					start: minTime,
					order: updatedOrder,
					limit: getUpdatedPageSize,
					offset: getUpdatedOffset,
					orderParam: getUpdatedParams,
					exceptionType: getUpdatedExceptionType,
					serviceName: getUpdatedServiceName,
					tags: convertCompositeQueryToTraceSelectedTags(
						compositeData?.builder.queryData?.[0]?.filters?.items || [],
					),
				}),
			enabled: !loading,
		},
		{
			queryKey: [
				'getErrorCounts',
				maxTime,
				minTime,
				getUpdatedExceptionType,
				getUpdatedServiceName,
				compositeData,
			],
			queryFn: (): Promise<ErrorResponse | SuccessResponse<number>> =>
				getErrorCounts({
					end: maxTime,
					start: minTime,
					exceptionType: getUpdatedExceptionType,
					serviceName: getUpdatedServiceName,
					tags: convertCompositeQueryToTraceSelectedTags(
						compositeData?.builder.queryData?.[0]?.filters?.items || [],
					),
				}),
			enabled: !loading,
		},
	]);
	const { notifications } = useNotifications();

	useEffect(() => {
		if (data?.error) {
			notifications.error({
				message: data.error || t('something_went_wrong'),
			});
		}
	}, [data?.error, data?.payload, t, notifications]);

	const getDateValue = (
		value: string,
		formatTimezoneAdjustedTimestamp: (
			input: TimestampInput,
			format?: string,
		) => string,
	): JSX.Element => (
		<Typography>
			{formatTimezoneAdjustedTimestamp(
				value,
				DATE_TIME_FORMATS.UK_DATETIME_SECONDS,
			)}
		</Typography>
	);

	const filterIcon = useCallback(() => <SearchOutlined />, []);

	const handleSearch = useCallback(
		(
			confirm: (param?: FilterConfirmProps) => void,
			filterValue: string,
			filterKey: string,
		): VoidFunction => (): void => {
			const { exceptionFilterValue, serviceFilterValue } = getFilterValues(
				getUpdatedServiceName || '',
				getUpdatedExceptionType || '',
				filterKey,
				filterValue || '',
			);

			const queryParams: QueryParams = {
				order: updatedOrder,
				offset: getUpdatedOffset,
				orderParam: getUpdatedParams,
				pageSize: getUpdatedPageSize,
				compositeQuery: getUpdatedCompositeQuery,
			};

			if (exceptionFilterValue && exceptionFilterValue !== 'undefined') {
				queryParams.exceptionType = exceptionFilterValue;
			}

			if (serviceFilterValue && serviceFilterValue !== 'undefined') {
				queryParams.serviceName = serviceFilterValue;
			}

			history.replace(`${pathname}?${createQueryParams(queryParams)}`);
			confirm();
		},
		[
			getUpdatedExceptionType,
			getUpdatedOffset,
			getUpdatedPageSize,
			getUpdatedParams,
			getUpdatedServiceName,
			getUpdatedCompositeQuery,
			pathname,
			updatedOrder,
		],
	);

	const filterDropdownWrapper = useCallback(
		({
			setSelectedKeys,
			selectedKeys,
			confirm,
			placeholder,
			filterKey,
		}: FilterDropdownExtendsProps) => (
			<Card size="small">
				<Space align="start" direction="vertical">
					<Input
						placeholder={placeholder}
						value={selectedKeys[0]}
						onChange={
							(e): void => setSelectedKeys(e.target.value ? [e.target.value] : [])

							// Need to fix this logic, when the value in empty, it's setting undefined string as value
						}
						allowClear
						defaultValue={getDefaultFilterValue(
							filterKey,
							getUpdatedServiceName,
							getUpdatedExceptionType,
						)}
						onPressEnter={handleSearch(confirm, String(selectedKeys[0]), filterKey)}
					/>
					<Button
						type="primary"
						onClick={handleSearch(confirm, String(selectedKeys[0]), filterKey)}
						icon={<SearchOutlined />}
						size="small"
					>
						Search
					</Button>
				</Space>
			</Card>
		),
		[getUpdatedExceptionType, getUpdatedServiceName, handleSearch],
	);

	const onExceptionTypeFilter: ColumnType<Exception>['onFilter'] = useCallback(
		(value: unknown, record: Exception): boolean => {
			if (record.exceptionType && typeof value === 'string') {
				return record.exceptionType.toLowerCase().includes(value.toLowerCase());
			}
			return false;
		},
		[],
	);

	const onApplicationTypeFilter = useCallback(
		(value: unknown, record: Exception): boolean => {
			if (record.serviceName && typeof value === 'string') {
				return record.serviceName.toLowerCase().includes(value.toLowerCase());
			}
			return false;
		},
		[],
	);

	const getFilter = useCallback(
		(
			onFilter: ColumnType<Exception>['onFilter'],
			placeholder: string,
			filterKey: string,
		): ColumnType<Exception> => ({
			onFilter,
			filterIcon,
			filterDropdown: ({ confirm, selectedKeys, setSelectedKeys }): JSX.Element =>
				filterDropdownWrapper({
					setSelectedKeys,
					selectedKeys,
					confirm,
					placeholder,
					filterKey,
				}),
		}),
		[filterIcon, filterDropdownWrapper],
	);

	const { formatTimezoneAdjustedTimestamp } = useTimezone();

	const columns: ColumnsType<Exception> = [
		{
			title: 'Exception Type',
			width: 100,
			dataIndex: 'exceptionType',
			key: 'exceptionType',
			...getFilter(onExceptionTypeFilter, 'Search By Exception', 'exceptionType'),
			render: (value, record): JSX.Element => (
				<Tooltip overlay={(): JSX.Element => value}>
					<Link
						to={`${ROUTES.ERROR_DETAIL}?groupId=${
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
			width: 100,
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
			width: 50,
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
			width: 80,
			key: 'lastSeen',
			render: (value): JSX.Element =>
				getDateValue(value, formatTimezoneAdjustedTimestamp),
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
			width: 80,
			key: 'firstSeen',
			render: (value): JSX.Element =>
				getDateValue(value, formatTimezoneAdjustedTimestamp),
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
			width: 100,
			key: 'serviceName',
			sorter: true,
			defaultSortOrder: getDefaultOrder(
				getUpdatedParams,
				updatedOrder,
				'serviceName',
			),
			...getFilter(
				onApplicationTypeFilter,
				'Search By Application',
				'serviceName',
			),
		},
	];

	const { featureFlags } = useAppContext();
	const dotMetricsEnabled =
		featureFlags?.find((flag) => flag.name === FeatureKeys.DOT_METRICS_ENABLED)
			?.active || false;

	const onChangeHandler: TableProps<Exception>['onChange'] = useCallback(
		(
			paginations: TablePaginationConfig,
			filters: Record<string, FilterValue | null>,
			sorter: SorterResult<Exception>[] | SorterResult<Exception>,
		) => {
			if (!Array.isArray(sorter)) {
				const { pageSize = 0, current = 0 } = paginations;
				const { columnKey = '', order } = sorter;
				const updatedOrder = order === 'ascend' ? 'ascending' : 'descending';
				const params = new URLSearchParams(window.location.search);
				const { exceptionType, serviceName } = extractFilterValues(filters, {
					serviceName: getFilterString(params.get(urlKey.serviceName)),
					exceptionType: getFilterString(params.get(urlKey.exceptionType)),
				});
				const compositeQuery = params.get(urlKey.compositeQuery) || '';
				history.replace(
					`${pathname}?${createQueryParams({
						order: updatedOrder,
						offset: (current - 1) * pageSize,
						orderParam: columnKey,
						pageSize,
						exceptionType,
						serviceName,
						compositeQuery,
					})}`,
				);
			}
		},
		[pathname],
	);

	useEffect(() => {
		if (!isUndefined(errorCountResponse.data?.payload)) {
			const selectedEnvironments = queries.find(
				(val) => val.tagKey === getResourceDeploymentKeys(dotMetricsEnabled),
			)?.tagValue;

			logEvent('Exception: List page visited', {
				numberOfExceptions: errorCountResponse?.data?.payload,
				selectedEnvironments,
				resourceAttributeUsed: !!(
					compositeData?.builder.queryData?.[0]?.filters?.items?.length || 0
				),
				tags: convertCompositeQueryToTraceSelectedTags(
					compositeData?.builder.queryData?.[0]?.filters?.items || [],
				),
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [errorCountResponse.data?.payload]);

	return (
		<ResizeTable
			columns={columns}
			tableLayout="fixed"
			dataSource={data?.payload as Exception[]}
			rowKey="firstSeen"
			loading={isLoading || false || errorCountResponse.status === 'loading'}
			pagination={{
				pageSize: getUpdatedPageSize,
				responsive: true,
				current: Math.floor(getUpdatedOffset / getUpdatedPageSize) + 1,
				position: ['bottomLeft'],
				total: errorCountResponse.data?.payload || 0,
			}}
			onChange={onChangeHandler}
		/>
	);
}

export default AllErrors;
