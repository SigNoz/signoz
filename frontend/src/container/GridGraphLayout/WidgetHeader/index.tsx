import {
	DeleteOutlined,
	DownOutlined,
	EditFilled,
	ExclamationCircleOutlined,
	FullscreenOutlined,
} from '@ant-design/icons';
import { Dropdown, MenuProps, Tooltip, Typography } from 'antd';
import { MenuItemType } from 'antd/es/menu/hooks/useItems';
import Spinner from 'components/Spinner';
import useComponentPermission from 'hooks/useComponentPermission';
import history from 'lib/history';
import React, { useCallback, useMemo, useState } from 'react';
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
import {
	ArrowContainer,
	HeaderContainer,
	HeaderContentContainer,
} from './styles';

type TWidgetOptions = 'view' | 'edit' | 'delete' | string;
interface IWidgetHeaderProps {
	title: string;
	widget: Widgets;
	onView: VoidFunction;
	onDelete: VoidFunction;
	parentHover: boolean;
	queryResponse: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps> | ErrorResponse
	>;
	errorMessage: string | undefined;
}
function WidgetHeader({
	title,
	widget,
	onView,
	onDelete,
	parentHover,
	queryResponse,
	errorMessage,
}: IWidgetHeaderProps): JSX.Element {
	const [localHover, setLocalHover] = useState(false);
	const [isOpen, setIsOpen] = useState<boolean>(false);

	const onEditHandler = useCallback((): void => {
		const widgetId = widget.id;
		history.push(
			`${window.location.pathname}/new?widgetId=${widgetId}&graphType=${widget.panelTypes}`,
		);
	}, [widget.id, widget.panelTypes]);

	const keyMethodMapping: {
		[K in TWidgetOptions]: { key: TWidgetOptions; method: VoidFunction };
	} = useMemo(
		() => ({
			view: {
				key: 'view',
				method: onView,
			},
			edit: {
				key: 'edit',
				method: onEditHandler,
			},
			delete: {
				key: 'delete',
				method: onDelete,
			},
		}),
		[onDelete, onEditHandler, onView],
	);

	const onMenuItemSelectHandler: MenuProps['onClick'] = useCallback(
		({ key }: { key: TWidgetOptions }): void => {
			const functionToCall = keyMethodMapping[key]?.method;
			if (functionToCall) {
				functionToCall();
				setIsOpen(false);
			}
		},
		[keyMethodMapping],
	);
	const { role } = useSelector<AppState, AppReducer>((state) => state.app);

	const [deleteWidget, editWidget] = useComponentPermission(
		['delete_widget', 'edit_widget'],
		role,
	);

	const menuList: MenuItemType[] = useMemo(
		() => [
			{
				key: keyMethodMapping.view.key,
				icon: <FullscreenOutlined />,
				disabled: queryResponse.isLoading,
				label: 'View',
			},
			{
				key: keyMethodMapping.edit.key,
				icon: <EditFilled />,
				disabled: !editWidget,
				label: 'Edit',
			},
			{
				key: keyMethodMapping.delete.key,
				icon: <DeleteOutlined />,
				disabled: !deleteWidget,
				danger: true,
				label: 'Delete',
			},
		],
		[
			deleteWidget,
			editWidget,
			keyMethodMapping.delete.key,
			keyMethodMapping.edit.key,
			keyMethodMapping.view.key,
			queryResponse.isLoading,
		],
	);

	const onClickHandler = useCallback(() => {
		setIsOpen((open) => !open);
	}, []);

	const menu = useMemo(
		() => ({
			items: menuList,
			onClick: onMenuItemSelectHandler,
		}),
		[menuList, onMenuItemSelectHandler],
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

export default WidgetHeader;
