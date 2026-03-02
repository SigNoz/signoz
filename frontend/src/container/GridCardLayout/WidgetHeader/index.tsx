import { ReactNode, useCallback, useMemo, useState } from 'react';
import { UseQueryResult } from 'react-query';
import {
	AlertOutlined,
	InfoCircleOutlined,
	MoreOutlined,
	SearchOutlined,
} from '@ant-design/icons';
import { Button } from '@signozhq/button';
import { Color } from '@signozhq/design-tokens';
import {
	ClipboardCopy,
	CloudDownload,
	Expand,
	Pencil,
	Trash,
} from '@signozhq/icons';
import { Input, Popover, Tooltip, Typography } from 'antd';
import ErrorContent from 'components/ErrorModal/components/ErrorContent';
import ErrorPopover from 'components/ErrorPopover/ErrorPopover';
import { GuardButton } from 'components/PermissionlessButton/PermissionlessButton';
import Spinner from 'components/Spinner';
import WarningPopover from 'components/WarningPopover/WarningPopover';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import useGetResolvedText from 'hooks/dashboard/useGetResolvedText';
import useCreateAlerts from 'hooks/queryBuilder/useCreateAlerts';
import { buildObjectString } from 'hooks/useAuthZ/utils';
import useComponentPermission from 'hooks/useComponentPermission';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { isEmpty } from 'lodash-es';
import { CircleX, SquareArrowOutUpRight, X } from 'lucide-react';
import { unparse } from 'papaparse';
import { useAppContext } from 'providers/App/App';
import { SuccessResponse, Warning } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import APIError from 'types/api/error';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { buildAbsolutePath } from 'utils/app';

import { cn } from '../../../lib/cn';
import { errorTooltipPosition } from './config';
import { MENUITEM_KEYS_VS_LABELS, MenuItemKeys } from './contants';
import { isTWidgetOptions } from './utils';

import './WidgetHeader.styles.scss';

interface IWidgetHeaderProps {
	title: ReactNode;
	widget: Widgets;
	onView: VoidFunction;
	onDelete?: VoidFunction;
	onClone?: VoidFunction;
	queryResponse: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps, unknown> & {
			warning?: Warning;
		},
		Error
	>;
	threshold?: ReactNode;
	headerMenuList?: MenuItemKeys[];
	isWarning: boolean;
	isFetchingResponse: boolean;
	tableProcessedDataRef: React.MutableRefObject<RowData[]>;
	setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
}

interface WidgetActionsMenuProps {
	isViewVisible: boolean;
	isEditVisible: boolean;
	isCloneVisible: boolean;
	isDownloadVisible: boolean;
	isDeleteVisible: boolean;
	isCreateAlertsVisible: boolean;
	dashboardId: string;
	isFetching: boolean;
	canEdit: boolean;
	canDelete: boolean;
	onActionClick: (key: MenuItemKeys) => void;
}

function WidgetActionsMenu({
	isViewVisible,
	isEditVisible,
	isCloneVisible,
	isDownloadVisible,
	isDeleteVisible,
	isCreateAlertsVisible,
	dashboardId,
	isFetching,
	canEdit,
	canDelete,
	onActionClick,
}: WidgetActionsMenuProps): JSX.Element {
	return (
		<div className="widget-header-menu-content" role="menu">
			{isViewVisible && (
				<GuardButton
					variant="ghost"
					prefixIcon={<Expand />}
					role="menuitem"
					relation="read"
					object={buildObjectString('dashboard', dashboardId)}
					disabled={isFetching}
					className="w-full gap-2 px-2 justify-start"
					onClick={(e): void => {
						e.stopPropagation();
						onActionClick(MenuItemKeys.View);
					}}
				>
					{MENUITEM_KEYS_VS_LABELS[MenuItemKeys.View]}
				</GuardButton>
			)}
			{isEditVisible && (
				<GuardButton
					variant="ghost"
					prefixIcon={<Pencil />}
					role="menuitem"
					relation="update"
					object={buildObjectString('dashboard', dashboardId)}
					disabled={!canEdit}
					className="w-full gap-2 px-2 justify-start"
					onClick={(e): void => {
						e.stopPropagation();
						onActionClick(MenuItemKeys.Edit);
					}}
				>
					{MENUITEM_KEYS_VS_LABELS[MenuItemKeys.Edit]}
				</GuardButton>
			)}
			{isCloneVisible && (
				<GuardButton
					variant="ghost"
					prefixIcon={<ClipboardCopy />}
					role="menuitem"
					relation="update"
					object={buildObjectString('dashboard', dashboardId)}
					disabled={!canEdit}
					className="w-full gap-2 px-2 justify-start"
					onClick={(e): void => {
						e.stopPropagation();
						onActionClick(MenuItemKeys.Clone);
					}}
				>
					{MENUITEM_KEYS_VS_LABELS[MenuItemKeys.Clone]}
				</GuardButton>
			)}
			{isDownloadVisible && (
				<GuardButton
					variant="ghost"
					prefixIcon={<CloudDownload />}
					role="menuitem"
					relation="read"
					object={buildObjectString('dashboard', dashboardId)}
					className="w-full gap-2 px-2 justify-start"
					onClick={(e): void => {
						e.stopPropagation();
						onActionClick(MenuItemKeys.Download);
					}}
				>
					{MENUITEM_KEYS_VS_LABELS[MenuItemKeys.Download]}
				</GuardButton>
			)}
			{isDeleteVisible && (
				<GuardButton
					variant="ghost"
					prefixIcon={<Trash />}
					role="menuitem"
					relation="update"
					object={buildObjectString('dashboard', dashboardId)}
					disabled={!canDelete}
					className="w-full gap-2 px-2 justify-start text-bg-cherry-500"
					onClick={(e): void => {
						e.stopPropagation();
						onActionClick(MenuItemKeys.Delete);
					}}
				>
					{MENUITEM_KEYS_VS_LABELS[MenuItemKeys.Delete]}
				</GuardButton>
			)}
			{isCreateAlertsVisible && (
				<GuardButton
					variant="ghost"
					prefixIcon={<AlertOutlined />}
					role="menuitem"
					relation="read"
					object={buildObjectString('dashboard', dashboardId)}
					className="w-full gap-2 px-2 justify-start"
					onClick={(e): void => {
						e.stopPropagation();
						onActionClick(MenuItemKeys.CreateAlerts);
					}}
				>
					<span
						style={{
							display: 'flex',
							alignItems: 'baseline',
							justifyContent: 'space-between',
							width: '100%',
						}}
					>
						{MENUITEM_KEYS_VS_LABELS[MenuItemKeys.CreateAlerts]}
						<SquareArrowOutUpRight size={10} />
					</span>
				</GuardButton>
			)}
		</div>
	);
}

function WidgetHeader({
	title,
	widget,
	onView,
	onDelete,
	onClone,
	queryResponse,
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
		const generatedUrl = buildAbsolutePath({
			relativePath: 'new',
			urlQueryString: urlQuery.toString(),
		});
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

	const onMenuItemSelectHandler = useCallback(
		(key: string): void => {
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

	const dashboardResourceId = useMemo(() => {
		const pathname = globalThis.window?.location?.pathname || '';
		return pathname.match(/\/dashboard\/([^/]+)/)?.[1] || String(widget.id);
	}, [widget.id]);
	const isViewVisible = headerMenuList?.includes(MenuItemKeys.View) || false;
	const isEditVisible = headerMenuList?.includes(MenuItemKeys.Edit) || false;
	const isCloneVisible = headerMenuList?.includes(MenuItemKeys.Clone) || false;
	const isDeleteVisible = headerMenuList?.includes(MenuItemKeys.Delete) || false;
	const isCreateAlertsVisible =
		headerMenuList?.includes(MenuItemKeys.CreateAlerts) || false;
	const isDownloadVisible = widget.panelTypes === PANEL_TYPES.TABLE;
	const hasVisibleActions =
		isViewVisible ||
		isEditVisible ||
		isCloneVisible ||
		isDeleteVisible ||
		isCreateAlertsVisible ||
		isDownloadVisible;
	const onWidgetActionClick = useCallback(
		(key: MenuItemKeys): void => {
			onMenuItemSelectHandler(key);
			setIsWidgetActionsOpen(false);
		},
		[onMenuItemSelectHandler],
	);

	const [showGlobalSearch, setShowGlobalSearch] = useState(false);
	const [isWidgetActionsOpen, setIsWidgetActionsOpen] = useState(false);

	const globalSearchAvailable = widget.panelTypes === PANEL_TYPES.TABLE;

	const { truncatedText, fullText } = useGetResolvedText({
		text: widget.title as string,
		maxLength: 100,
	});

	const renderErrorMessage = useMemo(
		() => <ErrorContent error={queryResponse.error as APIError} />,
		[queryResponse.error],
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
								setSearchTerm('');
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
						<Tooltip title={fullText} placement="top">
							<Typography.Text
								ellipsis
								data-testid={title}
								className="widget-header-title"
							>
								{truncatedText}
							</Typography.Text>
						</Tooltip>
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
							<ErrorPopover
								content={renderErrorMessage}
								placement={errorTooltipPosition}
								overlayStyle={{ padding: 0, maxWidth: '600px' }}
								overlayInnerStyle={{ padding: 0 }}
								autoAdjustOverflow
							>
								<CircleX
									size={16}
									style={{ cursor: 'pointer' }}
									color={Color.BG_CHERRY_500}
								/>
							</ErrorPopover>
						)}

						{isWarning && queryResponse.data?.warning && (
							<WarningPopover warningData={queryResponse.data?.warning as Warning} />
						)}
						{globalSearchAvailable && (
							<SearchOutlined
								className="search-header-icons"
								onClick={(): void => setShowGlobalSearch(true)}
								data-testid="widget-header-search"
							/>
						)}

						{hasVisibleActions && (
							<Popover
								open={isWidgetActionsOpen}
								onOpenChange={setIsWidgetActionsOpen}
								arrow={false}
								rootClassName="widget-header-popover"
								trigger="click"
								placement="bottomRight"
								content={
									<WidgetActionsMenu
										isViewVisible={isViewVisible}
										isEditVisible={isEditVisible}
										isCloneVisible={isCloneVisible}
										isDownloadVisible={isDownloadVisible}
										isDeleteVisible={isDeleteVisible}
										isCreateAlertsVisible={isCreateAlertsVisible}
										dashboardId={dashboardResourceId}
										isFetching={queryResponse.isFetching}
										canEdit={editWidget}
										canDelete={deleteWidget}
										onActionClick={onWidgetActionClick}
									/>
								}
							>
								<Button
									variant="ghost"
									size="icon"
									data-testid="widget-header-options"
									className={cn(
										'widget-header-more-options',
										globalSearchAvailable && 'widget-header-more-options-visible',
									)}
									prefixIcon={<MoreOutlined />}
								/>
							</Popover>
						)}
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
