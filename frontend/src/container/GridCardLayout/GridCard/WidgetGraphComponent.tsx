import { Typography } from 'antd';
import { ToggleGraphProps } from 'components/Graph/types';
import { SOMETHING_WENT_WRONG } from 'constants/api';
import GridPanelSwitch from 'container/GridPanelSwitch';
import { useUpdateDashboard } from 'hooks/dashboard/useUpdateDashboard';
import { useNotifications } from 'hooks/useNotifications';
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
import { FullViewContainer, Modal } from './styles';
import { WidgetGraphComponentProps } from './types';
import { getGraphVisibilityStateOnDataChange } from './utils';

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
	isWarning,
}: WidgetGraphComponentProps): JSX.Element {
	const [deleteModal, setDeleteModal] = useState(false);
	const [modal, setModal] = useState<boolean>(false);
	const [hovered, setHovered] = useState(false);
	const { notifications } = useNotifications();
	const { pathname } = useLocation();

	const lineChartRef = useRef<ToggleGraphProps>();

	const { graphVisibilityStates: localStoredVisibilityStates } = useMemo(
		() =>
			getGraphVisibilityStateOnDataChange({
				data,
				isExpandedName: true,
				name,
			}),
		[data, name],
	);

	useEffect(() => {
		if (!lineChartRef.current) return;

		localStoredVisibilityStates.forEach((state, index) => {
			lineChartRef.current?.toggleGraph(index, state);
		});
	}, [localStoredVisibilityStates]);

	const { setLayouts, selectedDashboard, setSelectedDashboard } = useDashboard();

	const [graphsVisibilityStates, setGraphsVisibilityStates] = useState<
		boolean[]
	>(localStoredVisibilityStates);

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
						setGraphsVisibilityStates={setGraphsVisibilityStates}
						parentChartRef={lineChartRef}
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
					isWarning={isWarning}
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

export default WidgetGraphComponent;
