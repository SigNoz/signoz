import { Typography } from 'antd';
import { ToggleGraphProps } from 'components/Graph/types';
import { Events } from 'constants/events';
import GridPanelSwitch from 'container/GridPanelSwitch';
import { useChartMutable } from 'hooks/useChartMutable';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { isEmpty, isEqual } from 'lodash-es';
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
import { useTranslation } from 'react-i18next';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import { DeleteWidget } from 'store/actions/dashboard/deleteWidget';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import AppReducer from 'types/reducer/app';
import DashboardReducer from 'types/reducer/dashboards';
import { eventEmitter } from 'utils/getEventEmitter';
import { v4 } from 'uuid';

import { UpdateDashboard } from '../utils';
import WidgetHeader from '../WidgetHeader';
import FullView from './FullView';
import { PANEL_TYPES_VS_FULL_VIEW_TABLE } from './FullView/contants';
import { FullViewContainer, Modal } from './styles';
import { DispatchProps, WidgetGraphComponentProps } from './types';
import {
	getGraphVisibilityStateOnDataChange,
	toggleGraphsVisibilityInChart,
} from './utils';

function WidgetGraphComponent({
	enableModel,
	enableWidgetHeader,
	data,
	widget,
	queryResponse,
	errorMessage,
	name,
	yAxisUnit,
	layout = [],
	deleteWidget,
	setLayout,
	onDragSelect,
	onClickHandler,
	threshold,
	headerMenuList,
}: WidgetGraphComponentProps): JSX.Element {
	const [deleteModal, setDeleteModal] = useState(false);
	const [modal, setModal] = useState<boolean>(false);
	const [hovered, setHovered] = useState(false);
	const { notifications } = useNotifications();
	const { t } = useTranslation(['common']);

	const { graphVisibilityStates: localstoredVisibilityStates } = useMemo(
		() =>
			getGraphVisibilityStateOnDataChange({
				data,
				isExpandedName: true,
				name,
			}),
		[data, name],
	);

	const [graphsVisibilityStates, setGraphsVisilityStates] = useState<boolean[]>(
		localstoredVisibilityStates,
	);

	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);
	const [selectedDashboard] = dashboards;

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

	const onDeleteHandler = useCallback(() => {
		const isEmptyWidget = widget?.id === 'empty' || isEmpty(widget);
		const widgetId = isEmptyWidget ? layout[0].i : widget?.id;

		featureResponse
			.refetch()
			.then(() => {
				deleteWidget({ widgetId, setLayout });
				onToggleModal(setDeleteModal);
			})
			.catch(() => {
				notifications.error({
					message: t('common:something_went_wrong'),
				});
			});
	}, [
		widget,
		layout,
		featureResponse,
		deleteWidget,
		setLayout,
		onToggleModal,
		notifications,
		t,
	]);

	const onCloneHandler = async (): Promise<void> => {
		const uuid = v4();

		const layout = [
			{
				i: uuid,
				w: 6,
				x: 0,
				h: 2,
				y: 0,
			},
			...(selectedDashboard.data.layout || []),
		];

		if (widget) {
			await UpdateDashboard(
				{
					data: selectedDashboard.data,
					generateWidgetId: uuid,
					graphType: widget?.panelTypes,
					selectedDashboard,
					layout,
					widgetData: widget,
					isRedirected: false,
				},
				notifications,
			).then(() => {
				notifications.success({
					message: 'Panel cloned successfully, redirecting to new copy.',
				});

				setTimeout(() => {
					history.push(
						`${history.location.pathname}/new?graphType=${widget?.panelTypes}&widgetId=${uuid}`,
					);
				}, 1500);
			});
		}
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

	const getModals = (): JSX.Element => (
		<>
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
						yAxisUnit={yAxisUnit}
						graphsVisibilityStates={graphsVisibilityStates}
						onToggleModelHandler={onToggleModelHandler}
					/>
				</FullViewContainer>
			</Modal>
		</>
	);

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
			{enableModel && getModals()}
			{!isEmpty(widget) && data && (
				<>
					{enableWidgetHeader && (
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
					)}
					<GridPanelSwitch
						panelType={widget.panelTypes}
						data={data}
						isStacked={widget.isStacked}
						opacity={widget.opacity}
						title={' '}
						name={name}
						yAxisUnit={yAxisUnit}
						onClickHandler={onClickHandler}
						onDragSelect={onDragSelect}
						panelData={queryResponse.data?.payload?.data.newResult.data.result || []}
						query={widget.query}
						ref={lineChartRef}
					/>
				</>
			)}
		</span>
	);
}

WidgetGraphComponent.defaultProps = {
	yAxisUnit: undefined,
	layout: undefined,
	setLayout: undefined,
	onDragSelect: undefined,
	onClickHandler: undefined,
};

const mapDispatchToProps = (
	dispatch: ThunkDispatch<unknown, unknown, AppActions>,
): DispatchProps => ({
	deleteWidget: bindActionCreators(DeleteWidget, dispatch),
});

export default connect(
	null,
	mapDispatchToProps,
)(
	memo(
		WidgetGraphComponent,
		(prevProps, nextProps) =>
			isEqual(prevProps.data, nextProps.data) && prevProps.name === nextProps.name,
	),
);
