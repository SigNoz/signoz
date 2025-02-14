import '../GridCardLayout.styles.scss';

import { Skeleton, Typography } from 'antd';
import cx from 'classnames';
import { ToggleGraphProps } from 'components/Graph/types';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { QueryParams } from 'constants/query';
import { PANEL_TYPES } from 'constants/queryBuilder';
import { placeWidgetAtBottom } from 'container/NewWidget/utils';
import PanelWrapper from 'container/PanelWrapper/PanelWrapper';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { useNotifications } from 'hooks/useNotifications';
import { useSafeNavigate } from 'hooks/useSafeNavigate';
import useUrlQuery from 'hooks/useUrlQuery';
import createQueryParams from 'lib/createQueryParams';
import { RowData } from 'lib/query/createTableColumnsFromQuery';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useRef,
	useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { Dashboard } from 'types/api/dashboard/getAll';
import { v4 } from 'uuid';

import WidgetHeader from '../WidgetHeader';
import FullView from './FullView';
import { Modal } from './styles';
import { WidgetGraphComponentProps } from './types';
import { getLocalStorageGraphVisibilityState } from './utils';

function WidgetGraphComponent({
	widget,
	queryResponse,
	errorMessage,
	version,
	threshold,
	headerMenuList,
	isWarning,
	isFetchingResponse,
	setRequestData,
	onClickHandler,
	onDragSelect,
	customTooltipElement,
	openTracesButton,
	onOpenTraceBtnClick,
	customSeries,
	customErrorMessage,
}: WidgetGraphComponentProps): JSX.Element {
	const { safeNavigate } = useSafeNavigate();
	const [deleteModal, setDeleteModal] = useState(false);
	const [hovered, setHovered] = useState(false);
	const { notifications } = useNotifications();
	const { pathname, search } = useLocation();

	const params = useUrlQuery();

	const isFullViewOpen = params.get(QueryParams.expandedWidgetId) === widget.id;

	const lineChartRef = useRef<ToggleGraphProps>();
	const [graphVisibility, setGraphVisibility] = useState<boolean[]>(
		Array(queryResponse.data?.payload?.data?.result?.length || 0).fill(true),
	);
	const graphRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!lineChartRef.current) return;

		graphVisibility.forEach((state, index) => {
			lineChartRef.current?.toggleGraph(index, state);
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const tableProcessedDataRef = useRef<RowData[]>([]);

	const { setLayouts, selectedDashboard, setSelectedDashboard } = useDashboard();

	const onToggleModal = useCallback(
		(func: Dispatch<SetStateAction<boolean>>) => {
			func((value) => !value);
		},
		[],
	);

	const updateDashboardMutation = useUpdateDashboard();

	const onDeleteHandler = (): void => {
		if (!selectedDashboard) return;

		const updatedWidgets = selectedDashboard?.data?.widgets?.filter(
			(e) => e.id !== widget.id,
		);

		const updatedLayout =
			selectedDashboard.data.layout?.filter((e) => e.i !== widget.id) || [];

		const updatedSelectedDashboard: Dashboard = {
			...selectedDashboard,
			data: {
				...selectedDashboard.data,
				widgets: updatedWidgets,
				layout: updatedLayout,
			},
			uuid: selectedDashboard.uuid,
		};

		updateDashboardMutation.mutateAsync(updatedSelectedDashboard, {
			onSuccess: (updatedDashboard) => {
				if (setLayouts) setLayouts(updatedDashboard.payload?.data?.layout || []);
				if (setSelectedDashboard && updatedDashboard.payload) {
					setSelectedDashboard(updatedDashboard.payload);
				}
				setDeleteModal(false);
			},
			onError: () => {
				notifications.error({
					message: SOMETHING_WENT_WRONG,
				});
			},
		});
	};

	const onCloneHandler = async (): Promise<void> => {
		if (!selectedDashboard) return;

		const uuid = v4();

		// this is added to make sure the cloned panel is of the same dimensions as the original one
		const originalPanelLayout = selectedDashboard.data.layout?.find(
			(l) => l.i === widget.id,
		);

		const newLayoutItem = placeWidgetAtBottom(
			uuid,
			selectedDashboard?.data.layout || [],
			originalPanelLayout?.w || 6,
			originalPanelLayout?.h || 6,
		);

		const layout = [...(selectedDashboard.data.layout || []), newLayoutItem];

		updateDashboardMutation.mutateAsync(
			{
				...selectedDashboard,
				data: {
					...selectedDashboard.data,
					layout,
					widgets: [
						...(selectedDashboard.data.widgets || []),
						{
							...{
								...widget,
								id: uuid,
							},
						},
					],
				},
			},
			{
				onSuccess: (updatedDashboard) => {
					if (setLayouts) setLayouts(updatedDashboard.payload?.data?.layout || []);
					if (setSelectedDashboard && updatedDashboard.payload) {
						setSelectedDashboard(updatedDashboard.payload);
					}
					notifications.success({
						message: 'Panel cloned successfully, redirecting to new copy.',
					});
					const queryParams = {
						graphType: widget?.panelTypes,
						widgetId: uuid,
					};
					safeNavigate(`${pathname}/new?${createQueryParams(queryParams)}`);
				},
			},
		);
	};

	const handleOnView = (): void => {
		const queryParams = {
			[QueryParams.expandedWidgetId]: widget.id,
		};
		const updatedSearch = createQueryParams(queryParams);
		const existingSearch = new URLSearchParams(search);
		const isExpandedWidgetIdPresent = existingSearch.has(
			QueryParams.expandedWidgetId,
		);
		if (isExpandedWidgetIdPresent) {
			existingSearch.delete(QueryParams.expandedWidgetId);
		}
		const separator = existingSearch.toString() ? '&' : '';
		const newSearch = `${existingSearch}${separator}${updatedSearch}`;

		safeNavigate({
			pathname,
			search: newSearch,
		});
	};

	const handleOnDelete = (): void => {
		onToggleModal(setDeleteModal);
	};

	const onDeleteModelHandler = (): void => {
		onToggleModal(setDeleteModal);
	};

	const onToggleModelHandler = (): void => {
		const existingSearchParams = new URLSearchParams(search);
		existingSearchParams.delete(QueryParams.expandedWidgetId);
		const updatedQueryParams = Object.fromEntries(existingSearchParams.entries());
		if (queryResponse.data?.payload) {
			const {
				graphVisibilityStates: localStoredVisibilityState,
			} = getLocalStorageGraphVisibilityState({
				apiResponse: queryResponse.data?.payload?.data?.result,
				name: widget.id,
			});
			setGraphVisibility(localStoredVisibilityState);
		}
		safeNavigate({
			pathname,
			search: createQueryParams(updatedQueryParams),
		});
	};

	const [searchTerm, setSearchTerm] = useState<string>('');

	return (
		<div
			style={{
				height: '100%',
			}}
			onMouseOver={(): void => {
				setHovered(true);
			}}
			onFocus={(): void => {
				setHovered(true);
			}}
			onMouseOut={(): void => {
				setHovered(false);
			}}
			onBlur={(): void => {
				setHovered(false);
			}}
			id={widget.id}
		>
			<Modal
				destroyOnClose
				onCancel={onDeleteModelHandler}
				open={deleteModal}
				confirmLoading={updateDashboardMutation.isLoading}
				title="Delete"
				height="10vh"
				onOk={onDeleteHandler}
				centered
			>
				<Typography>Are you sure you want to delete this widget</Typography>
			</Modal>

			<Modal
				title={widget?.title || 'View'}
				footer={[]}
				centered
				open={isFullViewOpen}
				onCancel={onToggleModelHandler}
				width="85%"
				destroyOnClose
				className="widget-full-view"
			>
				<FullView
					name={`${widget.id}expanded`}
					version={version}
					originalName={widget.id}
					widget={widget}
					yAxisUnit={widget.yAxisUnit}
					onToggleModelHandler={onToggleModelHandler}
					tableProcessedDataRef={tableProcessedDataRef}
				/>
			</Modal>

			<div className="drag-handle">
				<WidgetHeader
					parentHover={hovered}
					title={widget?.title}
					widget={widget}
					onView={handleOnView}
					onDelete={handleOnDelete}
					onClone={onCloneHandler}
					queryResponse={queryResponse}
					errorMessage={errorMessage}
					threshold={threshold}
					headerMenuList={headerMenuList}
					isWarning={isWarning}
					isFetchingResponse={isFetchingResponse}
					tableProcessedDataRef={tableProcessedDataRef}
					setSearchTerm={setSearchTerm}
				/>
			</div>

			{queryResponse.error && customErrorMessage && (
				<div className="error-message-container">
					<Typography.Text type="warning">{customErrorMessage}</Typography.Text>
				</div>
			)}

			{queryResponse.isLoading && widget.panelTypes !== PANEL_TYPES.LIST && (
				<Skeleton />
			)}
			{(queryResponse.isSuccess || widget.panelTypes === PANEL_TYPES.LIST) && (
				<div
					className={cx('widget-graph-container', widget.panelTypes)}
					ref={graphRef}
				>
					<PanelWrapper
						widget={widget}
						queryResponse={queryResponse}
						setRequestData={setRequestData}
						setGraphVisibility={setGraphVisibility}
						graphVisibility={graphVisibility}
						onClickHandler={onClickHandler}
						onDragSelect={onDragSelect}
						tableProcessedDataRef={tableProcessedDataRef}
						customTooltipElement={customTooltipElement}
						searchTerm={searchTerm}
						openTracesButton={openTracesButton}
						onOpenTraceBtnClick={onOpenTraceBtnClick}
						customSeries={customSeries}
					/>
				</div>
			)}
		</div>
	);
}

WidgetGraphComponent.defaultProps = {
	yAxisUnit: undefined,
	setLayout: undefined,
	onClickHandler: undefined,
};

export default WidgetGraphComponent;
