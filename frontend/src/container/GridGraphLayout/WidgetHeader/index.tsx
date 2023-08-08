import {
	CopyOutlined,
	DeleteOutlined,
	DownOutlined,
	EditFilled,
	ExclamationCircleOutlined,
	FullscreenOutlined,
} from '@ant-design/icons';
import { Dropdown, MenuProps, Tooltip, Typography } from 'antd';
import Spinner from 'components/Spinner';
import { queryParamNamesMap } from 'constants/queryBuilderQueryNames';
import ROUTES from 'constants/routes';
import useComponentPermission from 'hooks/useComponentPermission';
import history from 'lib/history';
import { useCallback, useMemo, useState } from 'react';
import { UseQueryResult } from 'react-query';
import { useSelector } from 'react-redux';
import { AppState } from 'store/reducers';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import AppReducer from 'types/reducer/app';

import {
	errorTooltipPosition,
	overlayStyles,
	spinnerStyles,
	tooltipStyles,
} from './config';
import { MENUITEM_KEYS_VS_LABELS, MenuItemKeys } from './contants';
import {
	ArrowContainer,
	HeaderContainer,
	HeaderContentContainer,
} from './styles';
import { MenuItem } from './types';
import { generateMenuList, isTWidgetOptions } from './utils';

interface IWidgetHeaderProps {
	title: string;
	widget: Widgets;
	onView: VoidFunction;
	onDelete?: VoidFunction;
	onClone?: VoidFunction;
	parentHover: boolean;
	queryResponse: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps> | ErrorResponse
	>;
	errorMessage: string | undefined;
	menuList: MenuItemKeys[];
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
	menuList,
}: IWidgetHeaderProps): JSX.Element {
	const [localHover, setLocalHover] = useState(false);
	const [isOpen, setIsOpen] = useState<boolean>(false);

	const onEditHandler = useCallback((): void => {
		const widgetId = widget.id;
		history.push(
			`${window.location.pathname}/new?widgetId=${widgetId}&graphType=${
				widget.panelTypes
			}&${queryParamNamesMap.compositeQuery}=${encodeURIComponent(
				JSON.stringify(widget.query),
			)}`,
		);
	}, [widget.id, widget.panelTypes, widget.query]);

	const onCreateAlertsHandler = useCallback(() => {
		history.push(
			`${ROUTES.ALERTS_NEW}?${
				queryParamNamesMap.compositeQuery
			}=${encodeURIComponent(JSON.stringify(widget.query))}`,
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
				isVisible: true,
				disabled: queryResponse.isLoading,
			},
			{
				key: MenuItemKeys.Edit,
				icon: <EditFilled />,
				label: MENUITEM_KEYS_VS_LABELS[MenuItemKeys.Edit],
				isVisible: menuList.includes(MenuItemKeys.Edit),
				disabled: !editWidget,
			},
			{
				key: MenuItemKeys.Clone,
				icon: <CopyOutlined />,
				label: MENUITEM_KEYS_VS_LABELS[MenuItemKeys.Clone],
				isVisible: menuList.includes(MenuItemKeys.Clone),
				disabled: !editWidget,
			},
			{
				key: MenuItemKeys.Delete,
				icon: <DeleteOutlined />,
				label: MENUITEM_KEYS_VS_LABELS[MenuItemKeys.Delete],
				isVisible: menuList.includes(MenuItemKeys.Delete),
				disabled: !deleteWidget,
				danger: true,
			},
			{
				key: MenuItemKeys.CreateAlerts,
				icon: <DeleteOutlined />,
				label: MENUITEM_KEYS_VS_LABELS[MenuItemKeys.CreateAlerts],
				isVisible: menuList.includes(MenuItemKeys.CreateAlerts),
				disabled: false,
			},
		],
		[queryResponse.isLoading, menuList, editWidget, deleteWidget],
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

	return (
		<div>
			<Dropdown
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
			{queryResponse.isFetching && !queryResponse.isError && (
				<Spinner height="5vh" style={spinnerStyles} />
			)}
			{queryResponse.isError && (
				<Tooltip title={errorMessage} placement={errorTooltipPosition}>
					<ExclamationCircleOutlined style={tooltipStyles} />
				</Tooltip>
			)}
		</div>
	);
}

WidgetHeader.defaultProps = {
	onDelete: undefined,
	onClone: undefined,
};

export default WidgetHeader;
