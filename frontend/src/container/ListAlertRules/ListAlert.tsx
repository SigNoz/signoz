/* eslint-disable react/display-name */
import { PlusOutlined } from '@ant-design/icons';
import {
	Button,
	Dropdown,
	Flex,
	Input,
	MenuProps,
	Tag,
	Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table/interface';
import saveAlertApi from 'api/alerts/save';
import logEvent from 'api/common/logEvent';
import DropDown from 'components/DropDown/DropDown';
import {
	DynamicColumnsKey,
	TableDataSource,
} from 'components/ResizeTable/contants';
import DynamicColumnTable from 'components/ResizeTable/DynamicColumnTable';
import DateComponent from 'components/ResizeTable/TableComponent/DateComponent';
import LabelColumn from 'components/TableRenderer/LabelColumn';
import TextToolTip from 'components/TextToolTip';
import { QueryParams } from 'constants/query';
import ROUTES from 'constants/routes';
import { sanitizeDefaultAlertQuery } from 'container/EditAlertV2/utils';
import useSortableTable from 'hooks/ResizeTable/useSortableTable';
import useComponentPermission from 'hooks/useComponentPermission';
import useDebouncedFn from 'hooks/useDebouncedFunction';
import useInterval from 'hooks/useInterval';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import history from 'lib/history';
import { mapQueryDataFromApi } from 'lib/newQueryBuilder/queryBuilderMappers/mapQueryDataFromApi';
import { useAppContext } from 'providers/App/App';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { AlertTypes } from 'types/api/alerts/alertTypes';
import { GettableAlert } from 'types/api/alerts/get';

import DeleteAlert from './DeleteAlert';
import { ColumnButton, SearchContainer } from './styles';
import Status from './TableComponents/Status';
import ToggleAlertState from './ToggleAlertState';
import { alertActionLogEvent, filterAlerts } from './utils';

const { Search } = Input;

function ListAlert({ allAlertRules, refetch }: ListAlertProps): JSX.Element {
	const { t } = useTranslation('common');
	const { user } = useAppContext();
	const [addNewAlert, action] = useComponentPermission(
		['add_new_alert', 'action'],
		user.role,
	);

	const [editLoader, setEditLoader] = useState<boolean>(false);
	const [cloneLoader, setCloneLoader] = useState<boolean>(false);

	const params = useUrlQuery();
	const orderColumnParam = params.get('columnKey');
	const orderQueryParam = params.get('order');
	const paginationParam = params.get('page');
	const searchParams = params.get('search');
	const [searchString, setSearchString] = useState<string>(searchParams || '');
	const [data, setData] = useState<GettableAlert[]>(() => {
		const value = searchString.toLowerCase();
		const filteredData = filterAlerts(allAlertRules, value);
		return filteredData || [];
	});

	// Type asuring
	const sortingOrder: 'ascend' | 'descend' | null =
		orderQueryParam === 'ascend' || orderQueryParam === 'descend'
			? orderQueryParam
			: null;

	const { sortedInfo, handleChange } = useSortableTable<GettableAlert>(
		sortingOrder,
		orderColumnParam || '',
		searchString,
	);

	const { notifications: notificationsApi } = useNotifications();

	useInterval(() => {
		(async (): Promise<void> => {
			const { data: refetchData, status } = await refetch();
			if (status === 'success') {
				const value = searchString.toLowerCase();
				const filteredData = filterAlerts(refetchData.payload || [], value);
				setData(filteredData || []);
			}
			if (status === 'error') {
				notificationsApi.error({
					message: t('something_went_wrong'),
				});
			}
		})();
	}, 30000);

	const handleError = useCallback((): void => {
		notificationsApi.error({
			message: t('something_went_wrong'),
		});
	}, [notificationsApi, t]);

	const onClickNewAlertV2Handler = useCallback(() => {
		logEvent('Alert: New alert button clicked', {
			number: allAlertRules?.length,
			layout: 'new',
		});
		history.push(`${ROUTES.ALERTS_NEW}?showNewCreateAlertsPage=true`);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const onClickNewClassicAlertHandler = useCallback(() => {
		logEvent('Alert: New alert button clicked', {
			number: allAlertRules?.length,
			layout: 'classic',
		});
		history.push(ROUTES.ALERTS_NEW);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const newAlertMenuItems: MenuProps['items'] = [
		{
			key: 'new',
			label: (
				<span>
					Try the new experience <Tag color="blue">Beta</Tag>
				</span>
			),
			onClick: onClickNewAlertV2Handler,
		},
		{
			key: 'classic',
			label: 'Continue with the classic experience',
			onClick: onClickNewClassicAlertHandler,
		},
	];

	const onEditHandler = (record: GettableAlert, openInNewTab: boolean): void => {
		const compositeQuery = sanitizeDefaultAlertQuery(
			mapQueryDataFromApi(record.condition.compositeQuery),
			record.alertType as AlertTypes,
		);
		params.set(
			QueryParams.compositeQuery,
			encodeURIComponent(JSON.stringify(compositeQuery)),
		);

		params.set(QueryParams.panelTypes, record.condition.compositeQuery.panelType);

		params.set(QueryParams.ruleId, record.id.toString());

		setEditLoader(false);

		if (openInNewTab) {
			window.open(`${ROUTES.ALERT_OVERVIEW}?${params.toString()}`, '_blank');
		} else {
			history.push(`${ROUTES.ALERT_OVERVIEW}?${params.toString()}`);
		}
	};

	const onCloneHandler = (
		originalAlert: GettableAlert,
	) => async (): Promise<void> => {
		const copyAlert = {
			...originalAlert,
			alert: originalAlert.alert.concat(' - Copy'),
		};
		const apiReq = { data: copyAlert };

		try {
			setCloneLoader(true);
			const response = await saveAlertApi(apiReq);

			if (response.statusCode === 200) {
				notificationsApi.success({
					message: 'Success',
					description: 'Alert cloned successfully',
				});

				const { data: refetchData, status } = await refetch();
				if (status === 'success' && refetchData.payload) {
					setData(refetchData.payload || []);
					setTimeout(() => {
						const clonedAlert = refetchData.payload[refetchData.payload.length - 1];
						params.set(QueryParams.ruleId, String(clonedAlert.id));
						history.push(`${ROUTES.EDIT_ALERTS}?${params.toString()}`);
					}, 2000);
				}
				if (status === 'error') {
					notificationsApi.error({
						message: t('something_went_wrong'),
					});
				}
			} else {
				notificationsApi.error({
					message: 'Error',
					description: response.error || t('something_went_wrong'),
				});
			}
		} catch (error) {
			handleError();
			console.error(error);
		} finally {
			setCloneLoader(false);
		}
	};

	const handleSearch = useDebouncedFn((e: unknown) => {
		const value = (e as React.BaseSyntheticEvent).target.value.toLowerCase();
		setSearchString(value);
		const filteredData = filterAlerts(allAlertRules, value);
		setData(filteredData);
	});

	const dynamicColumns: ColumnsType<GettableAlert> = [
		{
			title: 'Created At',
			dataIndex: 'createAt',
			width: 80,
			key: DynamicColumnsKey.CreatedAt,
			align: 'center',
			sorter: (a: GettableAlert, b: GettableAlert): number => {
				const prev = new Date(a.createAt).getTime();
				const next = new Date(b.createAt).getTime();

				return prev - next;
			},
			render: DateComponent,
			sortOrder:
				sortedInfo.columnKey === DynamicColumnsKey.CreatedAt
					? sortedInfo.order
					: null,
		},
		{
			title: 'Created By',
			dataIndex: 'createBy',
			width: 80,
			key: DynamicColumnsKey.CreatedBy,
			align: 'center',
		},
		{
			title: 'Updated At',
			dataIndex: 'updateAt',
			width: 80,
			key: DynamicColumnsKey.UpdatedAt,
			align: 'center',
			sorter: (a: GettableAlert, b: GettableAlert): number => {
				const prev = new Date(a.updateAt).getTime();
				const next = new Date(b.updateAt).getTime();

				return prev - next;
			},
			render: DateComponent,
			sortOrder:
				sortedInfo.columnKey === DynamicColumnsKey.UpdatedAt
					? sortedInfo.order
					: null,
		},
		{
			title: 'Updated By',
			dataIndex: 'updateBy',
			width: 80,
			key: DynamicColumnsKey.UpdatedBy,
			align: 'center',
		},
	];

	const columns: ColumnsType<GettableAlert> = [
		{
			title: 'Status',
			dataIndex: 'state',
			width: 80,
			key: 'state',
			sorter: (a, b): number =>
				(b.state ? b.state.charCodeAt(0) : 1000) -
				(a.state ? a.state.charCodeAt(0) : 1000),
			render: (value): JSX.Element => <Status status={value} />,
			sortOrder: sortedInfo.columnKey === 'state' ? sortedInfo.order : null,
		},
		{
			title: 'Alert Name',
			dataIndex: 'alert',
			width: 100,
			key: 'name',
			sorter: (alertA, alertB): number => {
				if (alertA.alert && alertB.alert) {
					return alertA.alert.localeCompare(alertB.alert);
				}
				return 0;
			},
			render: (value, record): JSX.Element => {
				const onClickHandler = (e: React.MouseEvent<HTMLElement>): void => {
					e.stopPropagation();
					e.preventDefault();
					onEditHandler(record, e.metaKey || e.ctrlKey);
				};

				return <Typography.Link onClick={onClickHandler}>{value}</Typography.Link>;
			},
			sortOrder: sortedInfo.columnKey === 'name' ? sortedInfo.order : null,
		},
		{
			title: 'Severity',
			dataIndex: 'labels',
			width: 80,
			key: 'severity',
			sorter: (a, b): number =>
				(a?.labels?.severity?.length || 0) - (b?.labels?.severity?.length || 0),
			render: (value): JSX.Element => {
				const objectKeys = value ? Object.keys(value) : [];
				const withSeverityKey = objectKeys.find((e) => e === 'severity') || '';
				const severityValue = withSeverityKey ? value[withSeverityKey] : '-';

				return <Typography>{severityValue}</Typography>;
			},
			sortOrder: sortedInfo.columnKey === 'severity' ? sortedInfo.order : null,
		},
		{
			title: 'Labels',
			dataIndex: 'labels',
			key: 'tags',
			align: 'center',
			width: 100,
			render: (value): JSX.Element => {
				const objectKeys = value ? Object.keys(value) : [];
				const withOutSeverityKeys = objectKeys.filter((e) => e !== 'severity');

				if (withOutSeverityKeys.length === 0) {
					return <Typography>-</Typography>;
				}

				return (
					<LabelColumn labels={withOutSeverityKeys} value={value} color="magenta" />
				);
			},
		},
	];

	if (action) {
		columns.push({
			title: 'Action',
			dataIndex: 'id',
			key: 'action',
			width: 10,
			render: (id: GettableAlert['id'], record): JSX.Element => (
				<div data-testid="alert-actions">
					<DropDown
						onDropDownItemClick={(item): void =>
							alertActionLogEvent(item.key, record)
						}
						element={[
							<ToggleAlertState
								key="1"
								disabled={record.disabled}
								setData={setData}
								id={id}
							/>,
							<ColumnButton
								key="2"
								onClick={(): void => onEditHandler(record, false)}
								type="link"
								loading={editLoader}
							>
								Edit
							</ColumnButton>,
							<ColumnButton
								key="3"
								onClick={(): void => onEditHandler(record, true)}
								type="link"
								loading={editLoader}
							>
								Edit in New Tab
							</ColumnButton>,
							<ColumnButton
								key="3"
								onClick={onCloneHandler(record)}
								type="link"
								loading={cloneLoader}
							>
								Clone
							</ColumnButton>,
							<DeleteAlert
								key="4"
								notifications={notificationsApi}
								setData={setData}
								id={id}
							/>,
						]}
					/>
				</div>
			),
		});
	}

	const paginationConfig = {
		defaultCurrent: Number(paginationParam) || 1,
	};
	return (
		<div className="alert-rules-list-container">
			<SearchContainer>
				<Search
					placeholder="Search by Alert Name, Severity and Labels"
					onChange={handleSearch}
					defaultValue={searchString}
				/>
				<Flex gap={12}>
					{addNewAlert && (
						<Dropdown menu={{ items: newAlertMenuItems }} trigger={['click']}>
							<Button type="primary" icon={<PlusOutlined />}>
								New Alert
							</Button>
						</Dropdown>
					)}
					<TextToolTip
						{...{
							text: `More details on how to create alerts`,
							url:
								'https://signoz.io/docs/alerts/?utm_source=product&utm_medium=list-alerts',
							urlText: 'Learn More',
						}}
					/>
				</Flex>
			</SearchContainer>
			<DynamicColumnTable
				tablesource={TableDataSource.Alert}
				columns={columns}
				rowKey="id"
				dataSource={data}
				shouldSendAlertsLogEvent
				dynamicColumns={dynamicColumns}
				onChange={handleChange}
				pagination={paginationConfig}
			/>
		</div>
	);
}

interface ListAlertProps {
	allAlertRules: GettableAlert[];
	refetch: UseQueryResult<
		ErrorResponse | SuccessResponse<GettableAlert[]>
	>['refetch'];
}

export default ListAlert;
