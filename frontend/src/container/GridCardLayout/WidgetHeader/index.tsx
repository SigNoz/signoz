import './WidgetHeader.styles.scss';

import {
	AlertOutlined,
	CopyOutlined,
	DeleteOutlined,
	EditFilled,
	ExclamationCircleOutlined,
	FullscreenOutlined,
	MoreOutlined,
	WarningOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, MenuProps, Tooltip, Typography } from 'antd';
import { getQueryRangeFormat } from 'api/dashboard/queryRangeFormat';
import Spinner from 'components/Spinner';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import useComponentPermission from 'hooks/useComponentPermission';
import { useNotifications } from 'hooks/useNotifications';
import { prepareQueryRangePayload } from 'lib/dashboard/prepareQueryRangePayload';
import history from 'lib/history';
import { ReactNode, useCallback, useMemo } from 'react';
import { useMutation, UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import AppReducer from 'types/reducer/app';
import { GlobalReducer } from 'types/reducer/globalTime';

import { errorTooltipPosition, WARNING_MESSAGE } from './config';
import { MENUITEM_KEYS_VS_LABELS, MenuItemKeys } from './contants';
import { MenuItem } from './types';
import { generateMenuList, isTWidgetOptions } from './utils';

interface IWidgetHeaderProps {
	title: ReactNode;
	widget: Widgets;
	onView: VoidFunction;
	onDelete?: VoidFunction;
	onClone?: VoidFunction;
	parentHover: boolean;
	queryResponse: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps> | ErrorResponse
	>;
	errorMessage: string | undefined;
	threshold?: ReactNode;
	headerMenuList?: MenuItemKeys[];
	isWarning: boolean;
}

function WidgetHeader({
	title,
	widget,
	onView,
	onDelete,
	onClone,
	parentHover,
	queryResponse,
	errorMessage,
	threshold,
	headerMenuList,
	isWarning,
}: IWidgetHeaderProps): JSX.Element | null {
	const onEditHandler = useCallback((): void => {
		const widgetId = widget.id;
		history.push(
			`${window.location.pathname}/new?widgetId=${widgetId}&graphType=${
				widget.panelTypes
			}&${QueryParams.compositeQuery}=${encodeURIComponent(
				JSON.stringify(widget.query),
			)}`,
		);
	}, [widget.id, widget.panelTypes, widget.query]);

	const queryRangeMutation = useMutation(getQueryRangeFormat);

	const { selectedTime: globalSelectedInterval } = useSelector<
		AppState,
		GlobalReducer
	>((state) => state.globalTime);

	const { notifications } = useNotifications();

	const onCreateAlertsHandler = useCallback(() => {
		const { queryPayload } = prepareQueryRangePayload({
			query: widget.query,
			globalSelectedInterval,
			graphType: widget.panelTypes,
			selectedTime: widget.timePreferance,
		});
		queryRangeMutation.mutate(queryPayload, {
			onSuccess: (data) => {
				history.push(
					`${ROUTES.ALERTS_NEW}?${QueryParams.compositeQuery}=${encodeURIComponent(
						JSON.stringify(data.compositeQuery),
					)}`,
				);
			},
			onError: () => {
				notifications.error({
					message: SOMETHING_WENT_WRONG,
				});
			},
		});
	}, [
		globalSelectedInterval,
		notifications,
		queryRangeMutation,
		widget.panelTypes,
		widget.query,
		widget.timePreferance,
	]);

	const keyMethodMapping = useMemo(
		() => ({
			[MenuItemKeys.View]: onView,
			[MenuItemKeys.Edit]: onEditHandler,
			[MenuItemKeys.Delete]: onDelete,
			[MenuItemKeys.Clone]: onClone,
			[MenuItemKeys.CreateAlerts]: onCreateAlertsHandler,
		}),
		[onDelete, onEditHandler, onView, onClone, onCreateAlertsHandler],
	);

	const onMenuItemSelectHandler: MenuProps['onClick'] = useCallback(
		({ key }: { key: string }): void => {
			if (isTWidgetOptions(key)) {
				const functionToCall = keyMethodMapping[key];

				if (functionToCall) {
					functionToCall();
				}
			}
		},
		[keyMethodMapping],
	);
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);

	const [deleteWidget, editWidget] = useComponentPermission(
		['delete_widget', 'edit_widget'],
		role,
	);

	const actions = useMemo(
		(): MenuItem[] => [
			{
				key: MenuItemKeys.View,
				icon: <FullscreenOutlined />,
				label: MENUITEM_KEYS_VS_LABELS[MenuItemKeys.View],
				isVisible: headerMenuList?.includes(MenuItemKeys.View) || false,
				disabled: queryResponse.isFetching,
			},
			{
				key: MenuItemKeys.Edit,
				icon: <EditFilled />,
				label: MENUITEM_KEYS_VS_LABELS[MenuItemKeys.Edit],
				isVisible: headerMenuList?.includes(MenuItemKeys.Edit) || false,
				disabled: !editWidget,
			},
			{
				key: MenuItemKeys.Clone,
				icon: <CopyOutlined />,
				label: MENUITEM_KEYS_VS_LABELS[MenuItemKeys.Clone],
				isVisible: headerMenuList?.includes(MenuItemKeys.Clone) || false,
				disabled: !editWidget,
			},
			{
				key: MenuItemKeys.Delete,
				icon: <DeleteOutlined />,
				label: MENUITEM_KEYS_VS_LABELS[MenuItemKeys.Delete],
				isVisible: headerMenuList?.includes(MenuItemKeys.Delete) || false,
				disabled: !deleteWidget,
				danger: true,
			},
			{
				key: MenuItemKeys.CreateAlerts,
				icon: <AlertOutlined />,
				label: MENUITEM_KEYS_VS_LABELS[MenuItemKeys.CreateAlerts],
				isVisible: headerMenuList?.includes(MenuItemKeys.CreateAlerts) || false,
				disabled: queryRangeMutation.isLoading,
			},
		],
		[
			headerMenuList,
			queryResponse.isFetching,
			editWidget,
			deleteWidget,
			queryRangeMutation.isLoading,
		],
	);

	const updatedMenuList = useMemo(() => generateMenuList(actions), [actions]);

	const menu = useMemo(
		() => ({
			items: updatedMenuList,
			onClick: onMenuItemSelectHandler,
		}),
		[updatedMenuList, onMenuItemSelectHandler],
	);

	if (widget.id === PANEL_TYPES.EMPTY_WIDGET) {
		return null;
	}

	return (
		<div className="widget-header-container">
			<Typography.Text
				ellipsis
				data-testid={title}
				className="widget-header-title"
			>
				{title}
			</Typography.Text>
			<div className="widget-header-actions">
				<div className="widget-api-actions">{threshold}</div>
				{queryResponse.isFetching && !queryResponse.isError && (
					<Spinner style={{ paddingRight: '0.25rem' }} />
				)}
				{queryResponse.isError && (
					<Tooltip
						title={errorMessage}
						placement={errorTooltipPosition}
						className="widget-api-actions"
					>
						<ExclamationCircleOutlined />
					</Tooltip>
				)}

				{isWarning && (
					<Tooltip
						title={WARNING_MESSAGE}
						placement={errorTooltipPosition}
						className="widget-api-actions"
					>
						<WarningOutlined />
					</Tooltip>
				)}
				<Dropdown menu={menu} trigger={['hover']} placement="bottomRight">
					<Button
						type="default"
						icon={<MoreOutlined />}
						className={`widget-header-more-options ${
							parentHover ? 'widget-header-hover' : ''
						}`}
					/>
				</Dropdown>
			</div>
		</div>
	);
}

WidgetHeader.defaultProps = {
	onDelete: undefined,
	onClone: undefined,
	threshold: undefined,
	headerMenuList: [MenuItemKeys.View],
};

export default WidgetHeader;
