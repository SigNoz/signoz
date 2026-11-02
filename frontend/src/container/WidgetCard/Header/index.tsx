import { ReactNode, useCallback, useMemo, useState } from 'react';
import { UseQueryResult } from 'react-query';
import {
	Bell,
	CircleX,
	CloudDownload,
	Copy,
	EllipsisVertical,
	Fullscreen,
	Pencil,
	Search,
	SolidInfoCircle,
	SquareArrowOutUpRight,
	Trash2,
	X,
} from '@signozhq/icons';
import { Color } from '@signozhq/design-tokens';
import { Button, Input, Tooltip } from 'antd';
import { Dropdown } from '@signozhq/ui/dropdown';
import { Typography } from '@signozhq/ui/typography';
import ErrorContent from 'components/ErrorModal/components/ErrorContent';
import ErrorPopover from 'components/ErrorPopover/ErrorPopover';
import Spinner from 'components/Spinner';
import WarningPopover from 'components/WarningPopover/WarningPopover';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import useGetResolvedText from 'hooks/dashboard/useGetResolvedText';
import useCreateAlerts from 'hooks/queryBuilder/useCreateAlerts';
import useComponentPermission from 'hooks/useComponentPermission';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { isEmpty } from 'lodash-es';
import { unparse } from 'papaparse';
import { useAppContext } from 'providers/App/App';
import { SuccessResponse, Warning } from 'types/api';
import { Widgets } from 'types/api/widgets/widget';
import APIError from 'types/api/error';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import { buildAbsolutePath } from 'utils/app';

import { errorTooltipPosition } from 'container/WidgetCard/Header/config';
import {
	CLONE_DENIED_TOOLTIP,
	DELETE_DENIED_TOOLTIP,
	EDIT_DENIED_TOOLTIP,
	MENUITEM_KEYS_VS_LABELS,
	MenuItemKeys,
	VIEW_LOADING_TOOLTIP,
} from 'container/WidgetCard/Header/contants';
import { MenuItem } from 'container/WidgetCard/Header/types';
import { generateMenuList } from 'container/WidgetCard/Header/utils';

import 'container/WidgetCard/Header/WidgetHeader.styles.scss';

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

	const { user } = useAppContext();

	const [deleteWidget, editWidget] = useComponentPermission(
		['delete_widget', 'edit_widget'],
		user.role,
	);

	const actions = useMemo(
		(): MenuItem[] => [
			{
				type: 'item',
				value: MenuItemKeys.View,
				prefix: <Fullscreen size="md" />,
				label: MENUITEM_KEYS_VS_LABELS[MenuItemKeys.View],
				isVisible: headerMenuList?.includes(MenuItemKeys.View) || false,
				loading: queryResponse.isFetching,
				loadingTooltip: VIEW_LOADING_TOOLTIP,
				onClick: onView,
			},
			{
				type: 'item',
				value: MenuItemKeys.Edit,
				prefix: <Pencil size="md" />,
				label: MENUITEM_KEYS_VS_LABELS[MenuItemKeys.Edit],
				isVisible: headerMenuList?.includes(MenuItemKeys.Edit) || false,
				disabled: !editWidget,
				disabledTooltip: EDIT_DENIED_TOOLTIP,
				onClick: onEditHandler,
			},
			{
				type: 'item',
				value: MenuItemKeys.Clone,
				prefix: <Copy size="md" />,
				label: MENUITEM_KEYS_VS_LABELS[MenuItemKeys.Clone],
				isVisible: headerMenuList?.includes(MenuItemKeys.Clone) || false,
				disabled: !editWidget,
				disabledTooltip: CLONE_DENIED_TOOLTIP,
				onClick: onClone,
			},
			{
				type: 'item',
				value: MenuItemKeys.Download,
				prefix: <CloudDownload size="md" />,
				label: MENUITEM_KEYS_VS_LABELS[MenuItemKeys.Download],
				isVisible: widget.panelTypes === PANEL_TYPES.TABLE,
				onClick: onDownloadHandler,
			},
			{
				type: 'item',
				value: MenuItemKeys.Delete,
				prefix: <Trash2 size="md" />,
				label: MENUITEM_KEYS_VS_LABELS[MenuItemKeys.Delete],
				isVisible: headerMenuList?.includes(MenuItemKeys.Delete) || false,
				disabled: !deleteWidget,
				disabledTooltip: DELETE_DENIED_TOOLTIP,
				danger: true,
				onClick: onDelete,
			},
			{
				type: 'item',
				value: MenuItemKeys.CreateAlerts,
				prefix: <Bell size="md" />,
				label: MENUITEM_KEYS_VS_LABELS[MenuItemKeys.CreateAlerts],
				suffix: <SquareArrowOutUpRight size="lg" />,
				isVisible: headerMenuList?.includes(MenuItemKeys.CreateAlerts) || false,
				onClick: onCreateAlertsHandler,
			},
		],
		[
			headerMenuList,
			queryResponse.isFetching,
			editWidget,
			deleteWidget,
			widget.panelTypes,
			onView,
			onEditHandler,
			onClone,
			onDownloadHandler,
			onDelete,
			onCreateAlertsHandler,
		],
	);

	const menuItems = useMemo(() => generateMenuList(actions), [actions]);

	const [showGlobalSearch, setShowGlobalSearch] = useState(false);

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
					addonBefore={<Search size={14} />}
					placeholder="Search..."
					bordered={false}
					data-testid="widget-header-search-input"
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
								truncate={1}
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
								<SolidInfoCircle size="md" />
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
							<Search
								className="search-header-icons"
								onClick={(): void => setShowGlobalSearch(true)}
								data-testid="widget-header-search"
							/>
						)}
						{menuItems.length > 0 && (
							<Dropdown items={menuItems} nativeButton side="bottom" align="end">
								<Button
									data-testid="widget-header-options"
									className={`widget-header-more-options ${
										globalSearchAvailable ? 'widget-header-more-options-visible' : ''
									}`}
									icon={<EllipsisVertical size="md" />}
								/>
							</Dropdown>
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
