import { SearchOutlined } from '@ant-design/icons';
import type { SelectProps } from 'antd';
import {
	Button,
	Card,
	Form,
	Input,
	message,
	Select,
	Space,
	TableProps,
	Tooltip,
	Typography,
} from 'antd';
import { ColumnType, TablePaginationConfig } from 'antd/es/table';
import { FilterValue, SorterResult } from 'antd/es/table/interface';
import { ColumnsType } from 'antd/lib/table';
import { FilterConfirmProps } from 'antd/lib/table/interface';
import axios from 'api';
import getAll from 'api/errors/getAll';
import getErrorCounts from 'api/errors/getErrorCounts';
import { ResizeTable } from 'components/ResizeTable';
import ROUTES from 'constants/routes';
import dayjs from 'dayjs';
import { useNotifications } from 'hooks/useNotifications';
import useResourceAttribute from 'hooks/useResourceAttribute';
import { convertRawQueriesToTraceSelectedTags } from 'hooks/useResourceAttribute/utils';
import useUrlQuery from 'hooks/useUrlQuery';
import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueries } from 'react-query';
import { useSelector } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Exception, PayloadProps } from 'types/api/errors/getAll';
import { GlobalReducer } from 'types/reducer/globalTime';

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
};

const exceptionTypeOptions: SelectProps['options'] = [
	{
		value: 'JS_ERROR',
		label: 'JS_ERROR',
	},
	{
		value: 'Unhandled_Rejection',
		label: 'Rejection',
	},
	{
		value: 'XHR',
		label: 'XHR',
	},
	{
		value: 'FETCH',
		label: 'FETCH',
	},
	{
		value: 'RESOURCE',
		label: 'RESOURCE',
	},
];

const issueStatusOptions: SelectProps['options'] = [
	{ value: '0', label: '未修复' },
	{ value: '1', label: '修复中' },
	{ value: '2', label: '已修复' },
	{ value: '3', label: '已忽略' },
	{ value: '4', label: '重复出现' },
];

type SearchParamType = {
	exceptionType: string[];
	message: string;
	serviceName: string;
	issueStatus: string[];
};

function AllErrors(): JSX.Element {
	const [changeIssueStatusNum, setChangeIssueStatusNum] = useState<number>(0);
	const [searchParam, setSearchParam] = useState<SearchParamType>({
		exceptionType: [],
		message: '',
		serviceName: '',
		issueStatus: [],
	});
	const [messageApi, contextHolder] = message.useMessage();
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
		getUpdatedMessage,
		getUpdatedIssueStatus,
	} = useMemo(
		() => ({
			updatedOrder: getOrder(params.get(urlKey.order)),
			getUpdatedOffset: getOffSet(params.get(urlKey.offset)),
			getUpdatedParams: getOrderParams(params.get(urlKey.orderParam)),
			getUpdatedPageSize: getUpdatePageSize(params.get(urlKey.pageSize)),
			getUpdatedExceptionType: getFilterString(params.get(urlKey.exceptionType)),
			getUpdatedServiceName: getFilterString(params.get(urlKey.serviceName)),
			getUpdatedMessage: getFilterString(params.get(urlKey.message)),
			getUpdatedIssueStatus: getFilterString(params.get(urlKey.issueStatus)),
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
				message: getUpdatedMessage,
				issueStatus: getUpdatedIssueStatus,
			})}`,
		[
			pathname,
			updatedOrder,
			getUpdatedOffset,
			getUpdatedParams,
			getUpdatedPageSize,
			getUpdatedExceptionType,
			getUpdatedServiceName,
			getUpdatedMessage,
			getUpdatedIssueStatus,
		],
	);

	const { queries } = useResourceAttribute();

	const [{ isLoading, data }, errorCountResponse] = useQueries([
		{
			queryKey: [
				'getAllErrors',
				updatedPath,
				maxTime,
				minTime,
				queries,
				changeIssueStatusNum,
			],
			queryFn: (): Promise<SuccessResponse<PayloadProps> | ErrorResponse> =>
				getAll({
					end: maxTime,
					start: minTime,
					order: updatedOrder,
					limit: getUpdatedPageSize,
					offset: getUpdatedOffset,
					orderParam: getUpdatedParams,
					exceptionType: getUpdatedExceptionType.length
						? getUpdatedExceptionType.split(',')
						: [],
					serviceName: getUpdatedServiceName,
					tags: convertRawQueriesToTraceSelectedTags(queries),
					message: getUpdatedMessage,
					issueStatus: getUpdatedIssueStatus.length
						? getUpdatedIssueStatus.split(',')
						: [],
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
				queries,
			],
			queryFn: (): Promise<ErrorResponse | SuccessResponse<number>> =>
				getErrorCounts({
					end: maxTime,
					start: minTime,
					exceptionType: getUpdatedExceptionType.length
						? getUpdatedExceptionType.split(',')
						: [],
					serviceName: getUpdatedServiceName,
					tags: convertRawQueriesToTraceSelectedTags(queries),
					message: getUpdatedMessage,
					issueStatus: getUpdatedIssueStatus.length
						? getUpdatedIssueStatus.split(',')
						: [],
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

	const getDateValue = (value: string): JSX.Element => (
		<Typography>{dayjs(value).format('DD/MM/YYYY HH:mm:ss A')}</Typography>
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

	const handleIssueChange = (value: string, groupID: string) => {
		axios
			.post(`/changeIssueStatus`, {
				groupID,
				issueStatus: Number(value),
			})
			.then(({ data }) => {
				if (data) {
					messageApi.open({
						type: 'success',
						content: 'change success',
					});
					setTimeout(() => {
						setChangeIssueStatusNum(changeIssueStatusNum + 1);
					}, 800);
					return;
				}
				messageApi.open({
					type: 'warning',
					content: data,
				});
			})
			.catch((error) => {
				console.warn('handleIssueChangeError', error);
			});
	};

	const columns: ColumnsType<Exception> = [
		{
			title: 'Exception Type',
			width: 100,
			dataIndex: 'exceptionType',
			key: 'exceptionType',
			// ...getFilter(onExceptionTypeFilter, 'Search By Exception', 'exceptionType'),
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
			width: 80,
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
			width: 100,
			key: 'serviceName',
			sorter: true,
			defaultSortOrder: getDefaultOrder(
				getUpdatedParams,
				updatedOrder,
				'serviceName',
			),
			// ...getFilter(
			// 	onApplicationTypeFilter,
			// 	'Search By Application',
			// 	'serviceName',
			// ),
		},
		{
			title: 'issueStatus',
			dataIndex: 'issueStatus',
			width: 100,
			key: 'issueStatus',
			sorter: false,
			render: (_, record) => (
				<Select
					defaultValue={String(record.issueStatus)}
					style={{ width: 100 }}
					onChange={(value) => handleIssueChange(value, record.groupID)}
					options={issueStatusOptions}
				/>
			),
		},
	];

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
				// const params = new URLSearchParams(window.location.search);
				// const { exceptionType, serviceName } = extractFilterValues(filters, {
				// 	serviceName: getFilterString(params.get(urlKey.serviceName)),
				// 	exceptionType: getFilterString(params.get(urlKey.exceptionType)),
				// });
				history.replace(
					`${pathname}?${createQueryParams({
						order: updatedOrder,
						offset: (current - 1) * pageSize,
						orderParam: columnKey,
						pageSize,
						// exceptionType,
						// serviceName,
						...searchParam,
					})}`,
				);
			}
		},
		[pathname, searchParam],
	);

	const handleChangeType = (type: string, value: any) => {
		setSearchParam((old) => ({
			...old,
			[type]: value,
		}));
	};

	const handleNewSearch = () => {
		history.replace(
			`${pathname}?${createQueryParams({
				order: updatedOrder,
				offset: 0,
				orderParam: getUpdatedParams,
				pageSize: getUpdatedPageSize,
				...searchParam,
			})}`,
		);
	};

	return (
		<>
			{contextHolder}
			<div style={{ marginBottom: 20 }}>
				<Form name="search-form" layout="inline" labelCol={{ span: 8 }}>
					<Form.Item label="type">
						<Form.Item name="exceptionType">
							<Select
								mode="tags"
								style={{ width: 160 }}
								allowClear
								placeholder="Please select"
								defaultValue={
									getUpdatedExceptionType?.length
										? getUpdatedExceptionType.split(',')
										: []
								}
								onChange={(value) => handleChangeType('exceptionType', value)}
								options={exceptionTypeOptions}
							/>
						</Form.Item>
					</Form.Item>
					<Form.Item label="message">
						<Form.Item name="message">
							<Input
								style={{ width: 160 }}
								placeholder="Please input"
								allowClear
								defaultValue={getUpdatedMessage}
								onChange={(e) => handleChangeType('message', e.target.value)}
							/>
						</Form.Item>
					</Form.Item>
					<Form.Item label="Application">
						<Form.Item name="serviceName">
							<Input
								style={{ width: 160 }}
								placeholder="Please input"
								allowClear
								defaultValue={getUpdatedServiceName}
								onChange={(e) => handleChangeType('serviceName', e.target.value)}
							/>
						</Form.Item>
					</Form.Item>
					<Form.Item label="issueStatus">
						<Form.Item name="issueStatus">
							<Select
								mode="tags"
								style={{ width: 160 }}
								allowClear
								placeholder="Please select"
								defaultValue={
									getUpdatedIssueStatus?.length ? getUpdatedIssueStatus.split(',') : []
								}
								onChange={(value) => handleChangeType('issueStatus', value)}
								options={issueStatusOptions}
							/>
						</Form.Item>
					</Form.Item>
					<Form.Item label=" " colon={false}>
						<Button type="primary" onClick={handleNewSearch}>
							Search
						</Button>
					</Form.Item>
				</Form>
			</div>
			<ResizeTable
				columns={columns}
				tableLayout="fixed"
				dataSource={data?.payload as Exception[]}
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
		</>
	);
}

export default AllErrors;
