import './WidgetHeader.styles.scss';

import {
	AlertOutlined,
	CloudDownloadOutlined,
	CopyOutlined,
	DeleteOutlined,
	EditFilled,
	FullscreenOutlined,
	InfoCircleOutlined,
	MoreOutlined,
	SearchOutlined,
	WarningOutlined,
} from '@ant-design/icons';
import { Dropdown, Input, MenuProps, Tooltip, Typography } from 'antd';
import Spinner from 'components/Spinner';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import useCreateAlerts from 'hooks/queryBuilder/useCreateAlerts';
import useComponentPermission from 'hooks/useComponentPermission';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { isEmpty } from 'lodash-es';
import { CircleX, X } from 'lucide-react';
import { unparse } from 'papaparse';
import { useAppContext } from 'providers/App/App';
import { ReactNode, useCallback, useMemo, useState } from 'react';
import { UseQueryResult } from 'react-query';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';

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
	isFetchingResponse: boolean;
	tableProcessedDataRef: React.MutableRefObject<RowData[]>;
	setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
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
	isFetchingResponse,
	tableProcessedDataRef,
	setSearchTerm,
}: IWidgetHeaderProps): JSX.Element | null {
	const urlQuery = useUrlQuery();
	const { safeNavigate } = useSafeNavigate();
	const onEditHandler = useCallback((): void => {
		const widgetId = widget.id;
		urlQuery.set(QueryParams.widgetId, widgetId);
		urlQuery.set(QueryParams.graphType, widget.panelTypes);
		urlQuery.set(
			QueryParams.compositeQuery,
			encodeURIComponent(JSON.stringify(widget.query)),
		);
		const generatedUrl = `${window.location.pathname}/new?${urlQuery}`;
		safeNavigate(generatedUrl);
	}, [safeNavigate, urlQuery, widget.id, widget.panelTypes, widget.query]);

	const onCreateAlertsHandler = useCreateAlerts(widget, 'dashboardView');

	const onDownloadHandler = useCallback((): void => {
		const csv = unparse(tableProcessedDataRef.current);
		const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const csvUrl = URL.createObjectURL(csvBlob);
		const downloadLink = document.createElement('a');
		downloadLink.href = csvUrl;
		downloadLink.download = `${!isEmpty(title) ? title : 'table-panel'}.csv`;
		downloadLink.click();
		downloadLink.remove();
	}, [tableProcessedDataRef, title]);

	const keyMethodMapping = useMemo(
		() => ({
			[MenuItemKeys.View]: onView,
			[MenuItemKeys.Edit]: onEditHandler,
			[MenuItemKeys.Delete]: onDelete,
			[MenuItemKeys.Clone]: onClone,
			[MenuItemKeys.CreateAlerts]: onCreateAlertsHandler,
			[MenuItemKeys.Download]: onDownloadHandler,
		}),
		[
			onView,
			onEditHandler,
			onDelete,
			onClone,
			onCreateAlertsHandler,
			onDownloadHandler,
		],
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
	const { user } = useAppContext();

	const [deleteWidget, editWidget] = useComponentPermission(
		['delete_widget', 'edit_widget'],
		user.role,
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
				key: MenuItemKeys.Download,
				icon: <CloudDownloadOutlined />,
				label: MENUITEM_KEYS_VS_LABELS[MenuItemKeys.Download],
				isVisible: widget.panelTypes === PANEL_TYPES.TABLE,
				disabled: false,
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
				disabled: false,
			},
		],
		[
			headerMenuList,
			queryResponse.isFetching,
			editWidget,
			deleteWidget,
			widget.panelTypes,
		],
	);

	const updatedMenuList = useMemo(() => generateMenuList(actions), [actions]);

	const [showGlobalSearch, setShowGlobalSearch] = useState(false);

	const globalSearchAvailable = widget.panelTypes === PANEL_TYPES.TABLE;

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
			{showGlobalSearch ? (
				<Input
					addonBefore={<SearchOutlined size={14} />}
					placeholder="Search..."
					bordered={false}
					data-testid="widget-header-search-input"
					autoFocus
					addonAfter={
						<X
							size={14}
							onClick={(e): void => {
								e.stopPropagation();
								e.preventDefault();
								setShowGlobalSearch(false);
							}}
							className="search-header-icons"
						/>
					}
					key={widget.id}
					onChange={(e): void => {
						setSearchTerm(e.target.value || '');
					}}
				/>
			) : (
				<>
					<div className="widget-header-title-container">
						<Typography.Text
							ellipsis
							data-testid={title}
							className="widget-header-title"
						>
							{title}
						</Typography.Text>
						{widget.description && (
							<Tooltip
								title={widget.description}
								overlayClassName="long-tooltip"
								className="info-tooltip"
								placement="right"
							>
								<InfoCircleOutlined />
							</Tooltip>
						)}
					</div>
					<div className="widget-header-actions">
						<div className="widget-api-actions">{threshold}</div>
						{isFetchingResponse && !queryResponse.isError && (
							<Spinner style={{ paddingRight: '0.25rem' }} />
						)}
						{queryResponse.isError && (
							<Tooltip
								title={errorMessage}
								placement={errorTooltipPosition}
								className="widget-api-actions"
							>
								<CircleX size={20} />
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
						{globalSearchAvailable && (
							<SearchOutlined
								className="search-header-icons"
								onClick={(): void => setShowGlobalSearch(true)}
								data-testid="widget-header-search"
							/>
						)}
						<Dropdown menu={menu} trigger={['hover']} placement="bottomRight">
							<MoreOutlined
								data-testid="widget-header-options"
								className={`widget-header-more-options ${
									parentHover ? 'widget-header-hover' : ''
								} ${globalSearchAvailable ? 'widget-header-more-options-visible' : ''}`}
							/>
						</Dropdown>
					</div>
				</>
			)}
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
