import {
	CopyOutlined,
	DeleteOutlined,
	DownOutlined,
	EditFilled,
	ExclamationCircleOutlined,
	FullscreenOutlined,
} from '@ant-design/icons';
import { Dropdown, MenuProps, Tooltip, Typography } from 'antd';
import { MenuItemType } from 'antd/es/menu/hooks/useItems';
import Spinner from 'components/Spinner';
import { queryParamNamesMap } from 'constants/queryBuilderQueryNames';
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
	onDelete?: VoidFunction;
	onClone?: VoidFunction;
	parentHover: boolean;
	queryResponse: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps> | ErrorResponse
	>;
	errorMessage: string | undefined;
	allowDelete?: boolean;
	allowClone?: boolean;
	allowEdit?: boolean;
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
	allowClone = true,
	allowDelete = true,
	allowEdit = true,
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

	const keyMethodMapping: {
		[K in TWidgetOptions]: {
			key: TWidgetOptions;
			method: VoidFunction | undefined;
		};
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
			clone: {
				key: 'clone',
				method: onClone,
			},
		}),
		[onDelete, onEditHandler, onView, onClone],
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

	const actions = useMemo(
		(): MenuItem[] => [
			{
				key: 'view',
				icon: <FullscreenOutlined />,
				label: 'View',
				condition: true,
				disabled: queryResponse.isLoading,
			},
			{
				key: 'edit',
				icon: <EditFilled />,
				label: 'Edit',
				condition: allowEdit,
				disabled: !editWidget,
			},
			{
				key: 'clone',
				icon: <CopyOutlined />,
				label: 'Clone',
				condition: allowClone,
				disabled: !editWidget,
			},
			{
				key: 'delete',
				icon: <DeleteOutlined />,
				label: 'Delete',
				condition: allowDelete,
				disabled: !deleteWidget,
				danger: true,
			},
		],
		[
			allowEdit,
			allowClone,
			allowDelete,
			queryResponse.isLoading,
			deleteWidget,
			editWidget,
		],
	);

	const menuList: MenuItemType[] = useMemo(
		(): MenuItemType[] =>
			actions
				.filter((action: MenuItem): boolean => action.condition)
				.map(
					({ key, icon: Icon, label, disabled, ...rest }): MenuItemType => ({
						key: keyMethodMapping[key].key,
						icon: Icon,
						label,
						disabled,
						...rest,
					}),
				),
		[keyMethodMapping, actions],
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

WidgetHeader.defaultProps = {
	onDelete: undefined,
	onClone: undefined,
	allowDelete: undefined,
	allowClone: undefined,
	allowEdit: undefined,
};

interface MenuItem {
	key: string;
	icon: ReactNode;
	label: string;
	condition: boolean;
	disabled: boolean;
	danger?: boolean;
}

export default WidgetHeader;
