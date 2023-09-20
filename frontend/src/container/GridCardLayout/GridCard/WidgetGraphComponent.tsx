import { Typography } from 'antd';
import { ToggleGraphProps } from 'components/Graph/types';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import { Events } from 'constants/events';
import GridPanelSwitch from 'container/GridPanelSwitch';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { useChartMutable } from 'hooks/useChartMutable';
import { useNotifications } from 'hooks/useNotifications';
import createQueryParams from 'lib/createQueryParams';
import history from 'lib/history';
import isEqual from 'lodash-es/isEqual';
import { useDashboard } from 'providers/Dashboard/Dashboard';
import {
	Dispatch,
	memo,
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
import { eventEmitter } from 'utils/getEventEmitter';
import { v4 } from 'uuid';

import WidgetHeader from '../WidgetHeader';
import FullView from './FullView';
import { PANEL_TYPES_VS_FULL_VIEW_TABLE } from './FullView/contants';
import { FullViewContainer, Modal } from './styles';
import { WidgetGraphComponentProps } from './types';
import {
	getGraphVisibilityStateOnDataChange,
	toggleGraphsVisibilityInChart,
} from './utils';

function WidgetGraphComponent({
	data,
	widget,
	queryResponse,
	errorMessage,
	name,
	onDragSelect,
	onClickHandler,
	threshold,
	headerMenuList,
}: WidgetGraphComponentProps): JSX.Element {
	const [deleteModal, setDeleteModal] = useState(false);
	const [modal, setModal] = useState<boolean>(false);
	const [hovered, setHovered] = useState(false);
	const { notifications } = useNotifications();
	const { pathname } = useLocation();

	const { graphVisibilityStates: localstoredVisibilityStates } = useMemo(
		() =>
			getGraphVisibilityStateOnDataChange({
				data,
				isExpandedName: true,
				name,
			}),
		[data, name],
	);

	const { setLayouts, selectedDashboard } = useDashboard();

	const [graphsVisibilityStates, setGraphsVisilityStates] = useState<boolean[]>(
		localstoredVisibilityStates,
	);

	const canModifyChart = useChartMutable({
		panelType: widget.panelTypes,
		panelTypeAndGraphManagerVisibility: PANEL_TYPES_VS_FULL_VIEW_TABLE,
	});

	const lineChartRef = useRef<ToggleGraphProps>();

	// Updating the visibility state of the graph on data change according to global time range
	useEffect(() => {
		if (canModifyChart) {
			const newGraphVisibilityState = getGraphVisibilityStateOnDataChange({
				data,
				isExpandedName: true,
				name,
			});
			setGraphsVisilityStates(newGraphVisibilityState.graphVisibilityStates);
		}
	}, [canModifyChart, data, name]);

	useEffect(() => {
		const eventListener = eventEmitter.on(
			Events.UPDATE_GRAPH_VISIBILITY_STATE,
			(data) => {
				if (data.name === `${name}expanded` && canModifyChart) {
					setGraphsVisilityStates([...data.graphVisibilityStates]);
				}
			},
		);
		return (): void => {
			eventListener.off(Events.UPDATE_GRAPH_VISIBILITY_STATE);
		};
	}, [canModifyChart, name]);

	useEffect(() => {
		if (canModifyChart && lineChartRef.current) {
			toggleGraphsVisibilityInChart({
				graphsVisibilityStates,
				lineChartRef,
			});
		}
	}, [graphsVisibilityStates, canModifyChart]);

	const { featureResponse } = useSelector<AppState, AppReducer>(
		(state) => state.app,
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
				h: 2,
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
		onToggleModal(setModal);
	};

	const handleOnDelete = (): void => {
		onToggleModal(setDeleteModal);
	};

	const onDeleteModelHandler = (): void => {
		onToggleModal(setDeleteModal);
	};

	const onToggleModelHandler = (): void => {
		onToggleModal(setModal);
	};

	return (
		<span
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
				title="View"
				footer={[]}
				centered
				open={modal}
				onCancel={onToggleModelHandler}
				width="85%"
				destroyOnClose
			>
				<FullViewContainer>
					<FullView
						name={`${name}expanded`}
						widget={widget}
						yAxisUnit={widget.yAxisUnit}
						graphsVisibilityStates={graphsVisibilityStates}
						onToggleModelHandler={onToggleModelHandler}
					/>
				</FullViewContainer>
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
				/>
			</div>
			<GridPanelSwitch
				panelType={widget.panelTypes}
				data={data}
				isStacked={widget.isStacked}
				opacity={widget.opacity}
				title={' '}
				name={name}
				yAxisUnit={widget.yAxisUnit}
				onClickHandler={onClickHandler}
				onDragSelect={onDragSelect}
				panelData={queryResponse.data?.payload?.data.newResult.data.result || []}
				query={widget.query}
				ref={lineChartRef}
			/>
		</span>
	);
}

WidgetGraphComponent.defaultProps = {
	yAxisUnit: undefined,
	setLayout: undefined,
	onDragSelect: undefined,
	onClickHandler: undefined,
};

export default memo(
	WidgetGraphComponent,
	(prevProps, nextProps) =>
		isEqual(prevProps.data, nextProps.data) && prevProps.name === nextProps.name,
);
