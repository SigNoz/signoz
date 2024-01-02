import '../GridCardLayout.styles.scss';

import { Skeleton, Typography } from 'antd';
import cx from 'classnames';
import { ToggleGraphProps } from 'components/Graph/types';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { QueryParams } from 'constants/query';
import GridPanelSwitch from 'container/GridPanelSwitch';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { useNotifications } from 'hooks/useNotifications';
import useUrlQuery from 'hooks/useUrlQuery';
import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import {
	Dispatch,
	SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { AppState } from 'store/reducers';
import { Dashboard } from 'types/api/dashboard/getAll';
import AppReducer from 'types/reducer/app';
import { v4 } from 'uuid';

import WidgetHeader from '../WidgetHeader';
import FullView from './FullView';
import { Modal } from './styles';
import { WidgetGraphComponentProps } from './types';
import { getGraphVisibilityStateOnDataChange } from './utils';

function WidgetGraphComponent({
	widget,
	queryResponse,
	errorMessage,
	name,
	onClickHandler,
	threshold,
	headerMenuList,
	isWarning,
	data,
	options,
	onDragSelect,
}: WidgetGraphComponentProps): JSX.Element {
	const [deleteModal, setDeleteModal] = useState(false);
	const [hovered, setHovered] = useState(false);
	const { notifications } = useNotifications();
	const { pathname, search } = useLocation();

	const params = useUrlQuery();

	const isFullViewOpen = params.get(QueryParams.expandedWidgetId) === widget.id;

	const lineChartRef = useRef<ToggleGraphProps>();
	const graphRef = useRef<HTMLDivElement>(null);

	const { graphVisibilityStates: localStoredVisibilityStates } = useMemo(
		() =>
			getGraphVisibilityStateOnDataChange({
				options,
				isExpandedName: true,
				name,
			}),
		[options, name],
	);

	const [graphsVisibilityStates, setGraphsVisibilityStates] = useState<
		boolean[]
	>(localStoredVisibilityStates);

	useEffect(() => {
		setGraphsVisibilityStates(localStoredVisibilityStates);
		if (!lineChartRef.current) return;

		localStoredVisibilityStates.forEach((state, index) => {
			lineChartRef.current?.toggleGraph(index, state);
		});
		setGraphsVisibilityStates(localStoredVisibilityStates);
	}, [localStoredVisibilityStates]);

	const { setLayouts, selectedDashboard, setSelectedDashboard } = useDashboard();

	const featureResponse = useSelector<AppState, AppReducer['featureResponse']>(
		(state) => state.app.featureResponse,
	);

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
				featureResponse.refetch();
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

		const layout = [
			...(selectedDashboard.data.layout || []),
			{
				i: uuid,
				w: 6,
				x: 0,
				h: 3,
				y: 0,
			},
		];

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
				onSuccess: () => {
					notifications.success({
						message: 'Panel cloned successfully, redirecting to new copy.',
					});
					const queryParams = {
						graphType: widget?.panelTypes,
						widgetId: uuid,
					};
					history.push(`${pathname}/new?${createQueryParams(queryParams)}`);
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

		history.push({
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
		history.push({
			pathname,
			search: createQueryParams(updatedQueryParams),
		});
	};

	if (queryResponse.isLoading || queryResponse.status === 'idle') {
		return (
			<Skeleton
				style={{
					height: '100%',
					padding: '16px',
				}}
			/>
		);
	}

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
			id={name}
		>
			<Modal
				destroyOnClose
				onCancel={onDeleteModelHandler}
				open={deleteModal}
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
			>
				<FullView
					name={`${name}expanded`}
					widget={widget}
					yAxisUnit={widget.yAxisUnit}
					onToggleModelHandler={onToggleModelHandler}
					parentChartRef={lineChartRef}
					onDragSelect={onDragSelect}
					setGraphsVisibilityStates={setGraphsVisibilityStates}
					graphsVisibilityStates={graphsVisibilityStates}
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
				/>
			</div>
			{queryResponse.isLoading && <Skeleton />}
			{queryResponse.isSuccess && (
				<div
					className={cx('widget-graph-container', widget.panelTypes)}
					ref={graphRef}
				>
					<GridPanelSwitch
						panelType={widget.panelTypes}
						data={data}
						name={name}
						ref={lineChartRef}
						options={options}
						yAxisUnit={widget.yAxisUnit}
						onClickHandler={onClickHandler}
						panelData={queryResponse.data?.payload?.data.newResult.data.result || []}
						query={widget.query}
						thresholds={widget.thresholds}
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
