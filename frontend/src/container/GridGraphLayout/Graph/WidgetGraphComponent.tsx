import { Typography } from 'antd';
import { ChartData } from 'chart.js';
import { LOCALSTORAGE } from 'constants/localStorage';
import GridGraphComponent from 'container/GridGraphComponent';
import { useNotifications } from 'hooks/useNotifications';
import history from 'lib/history';
import { isEmpty, isEqual } from 'lodash-es';
import {
	Dispatch,
	memo,
	SetStateAction,
	useCallback,
	useEffect,
	useState,
} from 'react';
import { Layout } from 'react-grid-layout';
import { useTranslation } from 'react-i18next';
import { UseQueryResult } from 'react-query';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { ThunkDispatch } from 'redux-thunk';
import {
	DeleteWidget,
	DeleteWidgetProps,
} from 'store/actions/dashboard/deleteWidget';
import { AppState } from 'store/reducers';
import AppActions from 'types/actions';
import { ErrorResponse, SuccessResponse } from 'types/api';
import { Widgets } from 'types/api/dashboard/getAll';
import { MetricRangePayloadProps } from 'types/api/metrics/getQueryRange';
import AppReducer from 'types/reducer/app';
import DashboardReducer from 'types/reducer/dashboards';
import { v4 } from 'uuid';

import { LayoutProps } from '..';
import { UpdateDashboard } from '../utils';
import WidgetHeader from '../WidgetHeader';
import { LegendEntryProps } from './FullView/GraphManager';
import FullView from './FullView/index.metricsBuilder';
import { FullViewContainer, Modal } from './styles';

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
}: WidgetGraphComponentProps): JSX.Element {
	const [deleteModal, setDeleteModal] = useState(false);
	const [modal, setModal] = useState<boolean>(false);
	const [hovered, setHovered] = useState(false);
	const { notifications } = useNotifications();
	const { t } = useTranslation(['common']);
	const [graphsVisibilityStates, setGraphsVisilityStates] = useState<
		boolean[]
	>();
	const { dashboards } = useSelector<AppState, DashboardReducer>(
		(state) => state.dashboards,
	);
	const [selectedDashboard] = dashboards;

	const graphVisibilityStateHandler = (
		newGraphsVisiblityState: boolean[],
	): void => {
		setGraphsVisilityStates([...newGraphsVisiblityState]);
	};

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

	useEffect(() => {
		if (localStorage.getItem(LOCALSTORAGE.GRAPH_VISIBILITY_STATES) !== null) {
			const legendGraphFromLocalStore = localStorage.getItem(
				LOCALSTORAGE.GRAPH_VISIBILITY_STATES,
			);
			const legendFromLocalStore: [
				{ name: string; dataIndex: LegendEntryProps[] },
			] = JSON.parse(legendGraphFromLocalStore as string);
			let isfound = false;
			const newGraphVisibilityStates = Array(data.datasets.length).fill(true);
			legendFromLocalStore.forEach((item) => {
				if (item.name === `${name}expanded`) {
					data.datasets.forEach((datasets, i) => {
						const index = item.dataIndex.findIndex(
							(dataKey) => dataKey.label === datasets.label,
						);
						if (index !== -1) {
							newGraphVisibilityStates[i] = item.dataIndex[index].show;
						}
					});
					setGraphsVisilityStates(newGraphVisibilityStates);
					isfound = true;
				}
			});
			// if legend is not found in local storage then set all graphs to true
			if (!isfound) {
				setGraphsVisilityStates(Array(data.datasets.length).fill(true));
			}
		} else {
			setGraphsVisilityStates(Array(data.datasets.length).fill(true));
		}
	}, [data, name]);

	const getModals = (): JSX.Element => (
		<>
			<Modal
				destroyOnClose
				onCancel={(): void => onToggleModal(setDeleteModal)}
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
				onCancel={(): void => onToggleModal(setModal)}
				width="85%"
				destroyOnClose
			>
				<FullViewContainer>
					<FullView
						name={`${name}expanded`}
						widget={widget}
						yAxisUnit={yAxisUnit}
						graphsVisibility={graphsVisibilityStates}
						graphVisibilityStateHandler={graphVisibilityStateHandler}
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
							/>
						</div>
					)}
					<GridGraphComponent
						GRAPH_TYPES={widget?.panelTypes}
						data={data}
						isStacked={widget?.isStacked}
						opacity={widget?.opacity}
						title={' '}
						name={name}
						yAxisUnit={yAxisUnit}
						graphsVisibilityStates={graphsVisibilityStates}
						onDragSelect={onDragSelect}
					/>
				</>
			)}
		</span>
	);
}

interface DispatchProps {
	deleteWidget: ({
		widgetId,
	}: DeleteWidgetProps) => (dispatch: Dispatch<AppActions>) => void;
}

interface WidgetGraphComponentProps extends DispatchProps {
	enableModel: boolean;
	enableWidgetHeader: boolean;
	widget: Widgets;
	queryResponse: UseQueryResult<
		SuccessResponse<MetricRangePayloadProps> | ErrorResponse
	>;
	errorMessage: string | undefined;
	data: ChartData;
	name: string;
	yAxisUnit?: string;
	layout?: Layout[];
	setLayout?: Dispatch<SetStateAction<LayoutProps[]>>;
	onDragSelect?: (start: number, end: number) => void;
}

WidgetGraphComponent.defaultProps = {
	yAxisUnit: undefined,
	layout: undefined,
	setLayout: undefined,
	onDragSelect: undefined,
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
