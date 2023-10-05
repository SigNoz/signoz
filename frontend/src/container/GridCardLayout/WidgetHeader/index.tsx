import {
	CopyOutlined,
	DeleteOutlined,
	DownOutlined,
	EditFilled,
	ExclamationCircleOutlined,
	FullscreenOutlined,
	WarningOutlined,
} from '@ant-design/icons';
import { Dropdown, MenuProps, Tooltip, Typography } from 'antd';
import Spinner from 'components/Spinner';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import ROUTES from 'constants/routes';
import useComponentPermission from 'hooks/useComponentPermission';
import history from 'lib/history';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import { UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import AppReducer from 'types/reducer/app';
import { popupContainer } from 'utils/selectPopupContainer';

import {
	errorTooltipPosition,
	overlayStyles,
	spinnerStyles,
	tooltipStyles,
	WARNING_MESSAGE,
} from './config';
import { MENUITEM_KEYS_VS_LABELS, MenuItemKeys } from './contants';
import {
	ArrowContainer,
	HeaderContainer,
	HeaderContentContainer,
	ThesholdContainer,
	WidgetHeaderContainer,
} from './styles';
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
	const [localHover, setLocalHover] = useState(false);
	const [isOpen, setIsOpen] = useState<boolean>(false);

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

	const onCreateAlertsHandler = useCallback(() => {
		history.push(
			`${ROUTES.ALERTS_NEW}?${QueryParams.compositeQuery}=${encodeURIComponent(
				JSON.stringify(widget.query),
			)}`,
		);
	}, [widget]);

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
					setIsOpen(false);
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
				icon: <DeleteOutlined />,
				label: MENUITEM_KEYS_VS_LABELS[MenuItemKeys.CreateAlerts],
				isVisible: headerMenuList?.includes(MenuItemKeys.CreateAlerts) || false,
				disabled: false,
			},
		],
		[headerMenuList, queryResponse.isFetching, editWidget, deleteWidget],
	);

	const updatedMenuList = useMemo(() => generateMenuList(actions), [actions]);

	const onClickHandler = useCallback(() => {
		setIsOpen((open) => !open);
	}, []);

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
		<WidgetHeaderContainer>
			<Dropdown
				getPopupContainer={popupContainer}
				destroyPopupOnHide
				open={isOpen}
				onOpenChange={setIsOpen}
				menu={menu}
				trigger={['click']}
				overlayStyle={overlayStyles}
			>
				<HeaderContainer
					onMouseOver={(): void => setLocalHover(true)}
					onMouseOut={(): void => setLocalHover(false)}
					hover={localHover}
					onClick={onClickHandler}
				>
					<HeaderContentContainer>
						<Typography.Text style={{ maxWidth: '80%' }} ellipsis>
							{title}
						</Typography.Text>
						<ArrowContainer hover={parentHover}>
							<DownOutlined />
						</ArrowContainer>
					</HeaderContentContainer>
				</HeaderContainer>
			</Dropdown>

			<ThesholdContainer>{threshold}</ThesholdContainer>
			{queryResponse.isFetching && !queryResponse.isError && (
				<Spinner height="5vh" style={spinnerStyles} />
			)}
			{queryResponse.isError && (
				<Tooltip title={errorMessage} placement={errorTooltipPosition}>
					<ExclamationCircleOutlined style={tooltipStyles} />
				</Tooltip>
			)}

			{isWarning && (
				<Tooltip title={WARNING_MESSAGE} placement={errorTooltipPosition}>
					<WarningOutlined style={tooltipStyles} />
				</Tooltip>
			)}
		</WidgetHeaderContainer>
	);
}

WidgetHeader.defaultProps = {
	onDelete: undefined,
	onClone: undefined,
	threshold: undefined,
	headerMenuList: [MenuItemKeys.View],
};

export default WidgetHeader;
